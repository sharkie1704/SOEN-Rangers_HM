import { prisma } from "../db/PrismaClient.ts";
import { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import { CourierError } from "../../domain/dlv/CourierError.ts";
import type { CourierAvailabilityRepository, CourierStatusEvent, RestaurantMapCourier } from "../../application/dlv/CourierAvailabilityRepository.ts";
import { lockCourier, type Tx } from "./lockCourier.ts";

export class PrismaCourierAvailabilityRepository implements CourierAvailabilityRepository {
  async findForRestaurantMap(restaurantId: string): Promise<RestaurantMapCourier[]> {
    const activeAssignments = await prisma.assignment.findMany({
      where: { status: "ACCEPTED", order: { restaurantId } },
      select: { courierId: true },
      distinct: ["courierId"],
    });
    const deliveryCourierIds = activeAssignments.map(({ courierId }) => courierId);
    const rows = await prisma.user.findMany({
      where: {
        role: "COURIER",
        courierStatus: { not: "OFFLINE" },
        courierLat: { not: null },
        courierLng: { not: null },
        OR: [{ courierStatus: "IDLE" }, { id: { in: deliveryCourierIds } }],
      },
      select: { id: true, name: true, courierLat: true, courierLng: true, courierStatus: true },
    });
    const deliveryCourierSet = new Set(deliveryCourierIds);
    return rows.flatMap((row) => row.courierLat != null && row.courierLng != null && row.courierStatus != null
      ? [{
        id: row.id,
        name: row.name,
        lat: row.courierLat,
        lng: row.courierLng,
        status: row.courierStatus,
        hasDelivery: deliveryCourierSet.has(row.id),
      }]
      : []);
  }

  async findCourierLocation(courierId: string): Promise<{ lat: number; lng: number } | undefined> {
    const row = await prisma.user.findFirst({
      where: { id: courierId, role: "COURIER", courierLat: { not: null }, courierLng: { not: null } },
      select: { courierLat: true, courierLng: true },
    });
    return row?.courierLat === null || row?.courierLng === null || !row
      ? undefined
      : { lat: row.courierLat, lng: row.courierLng };
  }

  async nextEventId(): Promise<number> {
    const [row] = await prisma.$queryRaw<{ id: bigint }[]>`SELECT nextval('"CourierStatusEvent_id_seq"') AS id`;
    return Number(row.id);
  }

  async findByCourierId(courierId: string): Promise<CourierAvailability | undefined> {
    const row = await prisma.user.findFirst({
      where: { id: courierId, role: "COURIER" },
      select: { id: true, courierStatus: true },
    });
    if (!row) return undefined;
    if (!row.courierStatus) throw new Error(`Courier ${row.id} has no status in the database`);
    return new CourierAvailability(row.id, row.courierStatus);
  }

  async save(courier: CourierAvailability, event: CourierStatusEvent): Promise<void> {
    await prisma.$transaction((tx) => this.applyStatus(tx, courier, event));
  }

  async saveResumedDelivery(courier: CourierAvailability, event: CourierStatusEvent): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Locked first, like a release, so an operator can't reassign the order halfway through
      await lockCourier(tx, courier.courierId);
      const accepted = await tx.assignment.findFirst({
        where: { courierId: courier.courierId, status: "ACCEPTED" },
        select: { id: true },
      });
      if (!accepted) {
        throw new CourierError("CONFLICT", "Your order was reassigned while you were off duty.");
      }
      await this.applyStatus(tx, courier, event);
    });
  }

  private async applyStatus(tx: Tx, courier: CourierAvailability, event: CourierStatusEvent): Promise<void> {
    // Only apply the change if nothing moved the courier since it was loaded,
    // e.g. an order being assigned while the courier goes off duty
    const { count } = await tx.user.updateMany({
      where: { id: courier.courierId, role: "COURIER", courierStatus: event.fromStatus },
      data: { courierStatus: courier.status },
    });
    if (count === 0) {
      throw new CourierError("CONFLICT", "Courier status just changed. Reload it and try again.");
    }
    await tx.courierStatusEvent.create({
      data: {
        id: event.eventId,
        courierId: event.courierId,
        actorId: event.actorId,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        occurredAt: event.occurredAt,
      },
    });
  }
}
