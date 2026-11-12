import { prisma } from "../db/PrismaClient.ts";
import type { AssignmentAction, AssignmentStatus as DbAssignmentStatus } from "../../generated/prisma/client.ts";
import { Assignment, type AssignmentStatus } from "../../domain/dlv/Assignment.ts";
import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import type { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import type { Order } from "../../domain/ord/Order.ts";
import type { AssignmentRepository, AssignmentChangeEvent } from "../../application/dlv/AssignmentRepository.ts";
import type { CourierStatusEvent } from "../../application/dlv/CourierAvailabilityRepository.ts";
import type { OrderSummary } from "../../domain/prc/OrderSummary.ts";
import { PrismaOrderRepository } from "../ord/PrismaOrderRepository.ts";
import { lockCourier, type Tx } from "./lockCourier.ts";

const toDbStatus: Record<AssignmentStatus, DbAssignmentStatus> = {
  Offered: "OFFERED",
  Accepted: "ACCEPTED",
  Declined: "DECLINED",
  Completed: "COMPLETED",
  Released: "RELEASED",
};

const fromDbStatus = Object.fromEntries(
  Object.entries(toDbStatus).map(([key, value]) => [value, key]),
) as Record<DbAssignmentStatus, AssignmentStatus>;

const activeStatuses: DbAssignmentStatus[] = ["OFFERED", "ACCEPTED"];

export class PrismaAssignmentRepository implements AssignmentRepository {
  async nextEventId(): Promise<number> {
    const [row] = await prisma.$queryRaw<{ id: bigint }[]>`SELECT nextval('"AssignmentEvent_id_seq"') AS id`;
    return Number(row.id);
  }

  async findActiveByOrderId(orderId: number): Promise<Assignment | undefined> {
    const row = await prisma.assignment.findFirst({ where: { orderId, status: { in: activeStatuses } } });
    return row ? new Assignment(row.orderId, row.courierId, fromDbStatus[row.status]) : undefined;
  }

  async findActiveByCourierId(courierId: string): Promise<Assignment | undefined> {
    const row = await prisma.assignment.findFirst({ where: { courierId, status: { in: activeStatuses } } });
    return row ? new Assignment(row.orderId, row.courierId, fromDbStatus[row.status]) : undefined;
  }

  async findDeclinedOrderIds(courierId: string): Promise<number[]> {
    const rows = await prisma.assignment.findMany({ where: { courierId, status: "DECLINED" }, select: { orderId: true } });
    return rows.map((row) => row.orderId);
  }

  async listAccepted(): Promise<Assignment[]> {
    const rows = await prisma.assignment.findMany({ where: { status: "ACCEPTED" }, orderBy: { orderId: "asc" } });
    return rows.map((row) => new Assignment(row.orderId, row.courierId, fromDbStatus[row.status]));
  }

  async saveOffer(assignment: Assignment, event: AssignmentChangeEvent): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const { count } = await tx.user.updateMany({
          where: { id: assignment.courierId, role: "COURIER", courierStatus: "IDLE" },
          data: { courierStatus: "IDLE" },
        });
        if (count === 0) {
          throw new AssignmentError("CONFLICT", "This courier is no longer free.");
        }
        const row = await tx.assignment.create({
          data: { orderId: assignment.orderId, courierId: assignment.courierId, status: toDbStatus[assignment.status] },
        });
        await tx.assignmentEvent.create({
          data: { id: event.eventId, assignmentId: row.id, actorId: event.courierId, action: "OFFER", occurredAt: event.occurredAt },
        });
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        throw new AssignmentError("CONFLICT", "This order or courier already has an active offer.");
      }
      throw error;
    }
  }

  async saveAccepted(assignment: Assignment, event: AssignmentChangeEvent, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await this.changeStatus(tx, assignment, event, "OFFERED", "ACCEPT");
      await this.moveCourier(tx, courier, courierEvent);
    });
  }

  async saveDeclined(assignment: Assignment, event: AssignmentChangeEvent): Promise<void> {
    await prisma.$transaction((tx) => this.changeStatus(tx, assignment, event, "OFFERED", "DECLINE"));
  }

  async saveReleased(assignment: Assignment, event: AssignmentChangeEvent): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // The courier may have come back on duty since the operator's check; if so, they keep the order
      const status = await lockCourier(tx, assignment.courierId);
      if (status !== undefined && status !== "OFFLINE") {
        throw new AssignmentError("CONFLICT", "The courier just came back on duty, so the order is no longer stalled.");
      }
      await this.changeStatus(tx, assignment, event, "ACCEPTED", "RELEASE");
    });
  }

  async savePickup(order: Order, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await new PrismaOrderRepository(tx).save(order);
      const restaurant = await tx.restaurant.findUnique({
        where: { id: order.restaurantId },
        select: { lat: true, lng: true },
      });
      await this.moveCourier(tx, courier, courierEvent, restaurant?.lat != null && restaurant.lng != null
        ? { lat: restaurant.lat, lng: restaurant.lng }
        : undefined);
    });
  }

  async saveDelivery(
    order: Order,
    assignment: Assignment,
    event: AssignmentChangeEvent,
    courier: CourierAvailability,
    courierEvent: CourierStatusEvent,
    summary: OrderSummary | null,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await new PrismaOrderRepository(tx).save(order);
      const customer = await tx.user.findFirst({
        where: { id: order.customerId, role: "CUSTOMER" },
        select: { deliveryLat: true, deliveryLng: true },
      });
      await this.moveCourier(tx, courier, courierEvent, customer?.deliveryLat != null && customer.deliveryLng != null
        ? { lat: customer.deliveryLat, lng: customer.deliveryLng }
        : undefined);
      await this.changeStatus(tx, assignment, event, "ACCEPTED", "COMPLETE");
      if (summary) {
        await tx.orderSummary.create({
          data: {
            orderId: summary.orderId,
            customerId: summary.customerId,
            restaurantId: summary.restaurantId,
            restaurantName: summary.restaurantName,
            subtotalCents: summary.fare.subtotalCents,
            deliveryFeeCents: summary.fare.deliveryFeeCents,
            serviceFeeCents: summary.fare.serviceFeeCents,
            smallOrderSurchargeCents: summary.fare.smallOrderSurchargeCents,
            totalCents: summary.fare.totalCents,
            placedAt: summary.placedAt,
            deliveredAt: summary.deliveredAt,
            generatedAt: summary.generatedAt,
          },
        });
      }
    });
  }

  private async changeStatus(tx: Tx, assignment: Assignment, event: AssignmentChangeEvent, from: DbAssignmentStatus, action: AssignmentAction): Promise<void> {
    const row = await tx.assignment.findFirst({
      where: { orderId: assignment.orderId, courierId: assignment.courierId, status: from },
      select: { id: true },
    });
    if (!row) {
      throw new AssignmentError("CONFLICT", "This assignment just changed. Reload it and try again.");
    }
    const { count } = await tx.assignment.updateMany({
      where: { id: row.id, status: from },
      data: { status: toDbStatus[assignment.status] },
    });
    if (count === 0) {
      throw new AssignmentError("CONFLICT", "This assignment just changed. Reload it and try again.");
    }
    await tx.assignmentEvent.create({
      data: { id: event.eventId, assignmentId: row.id, actorId: event.courierId, action, occurredAt: event.occurredAt },
    });
  }

  private async moveCourier(
    tx: Tx,
    courier: CourierAvailability,
    courierEvent: CourierStatusEvent,
    location?: { lat: number; lng: number },
  ): Promise<void> {
    const { count } = await tx.user.updateMany({
      where: { id: courier.courierId, role: "COURIER", courierStatus: courierEvent.fromStatus },
      data: {
        courierStatus: courier.status,
        ...(location ? { courierLat: location.lat, courierLng: location.lng } : {}),
      },
    });
    if (count === 0) {
      throw new AssignmentError("CONFLICT", "Courier status just changed. Reload it and try again.");
    }
    await tx.courierStatusEvent.create({
      data: {
        id: courierEvent.eventId,
        courierId: courierEvent.courierId,
        actorId: courierEvent.actorId,
        fromStatus: courierEvent.fromStatus,
        toStatus: courierEvent.toStatus,
        occurredAt: courierEvent.occurredAt,
      },
    });
  }
}
