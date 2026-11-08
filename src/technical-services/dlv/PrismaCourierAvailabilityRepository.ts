import { prisma } from "../db/PrismaClient.ts";
import { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import { CourierError } from "../../domain/dlv/CourierError.ts";
import type { CourierAvailabilityRepository, CourierStatusEvent } from "../../application/dlv/CourierAvailabilityRepository.ts";

export class PrismaCourierAvailabilityRepository implements CourierAvailabilityRepository {
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

  async listIdleCourierIds(): Promise<string[]> {
    const rows = await prisma.user.findMany({ where: { role: "COURIER", courierStatus: "IDLE" }, select: { id: true }, orderBy: { id: "asc" } });
    return rows.map((row) => row.id);
  }

  async save(courier: CourierAvailability, event: CourierStatusEvent): Promise<void> {
    await prisma.$transaction(async (tx) => {
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
    });
  }
}
