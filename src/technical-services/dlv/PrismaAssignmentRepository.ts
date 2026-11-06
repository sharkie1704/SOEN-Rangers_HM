import { prisma } from "../db/PrismaClient.ts";
import type { AssignmentAction, AssignmentStatus as DbAssignmentStatus } from "../../generated/prisma/client.ts";
import { Assignment, type AssignmentStatus } from "../../domain/dlv/Assignment.ts";
import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import type { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import type { Order } from "../../domain/ord/Order.ts";
import type { AssignmentRepository, AssignmentChangeEvent } from "../../application/dlv/AssignmentRepository.ts";
import type { CourierStatusEvent } from "../../application/dlv/CourierAvailabilityRepository.ts";
import { PrismaOrderRepository } from "../ord/PrismaOrderRepository.ts";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const toDbStatus: Record<AssignmentStatus, DbAssignmentStatus> = {
  Offered: "OFFERED",
  Accepted: "ACCEPTED",
  Declined: "DECLINED",
  Completed: "COMPLETED",
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

  async saveAccepted(assignment: Assignment, event: AssignmentChangeEvent, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await this.changeStatus(tx, assignment, event, "OFFERED", "ACCEPT");
      await this.moveCourier(tx, courier, courierEvent);
    });
  }

  async saveDeclined(assignment: Assignment, event: AssignmentChangeEvent): Promise<void> {
    await prisma.$transaction((tx) => this.changeStatus(tx, assignment, event, "OFFERED", "DECLINE"));
  }

  async savePickup(order: Order, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await new PrismaOrderRepository(tx).save(order);
      await this.moveCourier(tx, courier, courierEvent);
    });
  }

  async saveDelivery(order: Order, assignment: Assignment, event: AssignmentChangeEvent, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await new PrismaOrderRepository(tx).save(order);
      await this.moveCourier(tx, courier, courierEvent);
      await this.changeStatus(tx, assignment, event, "ACCEPTED", "COMPLETE");
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

  private async moveCourier(tx: Tx, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void> {
    const { count } = await tx.user.updateMany({
      where: { id: courier.courierId, role: "COURIER", courierStatus: courierEvent.fromStatus },
      data: { courierStatus: courier.status },
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
