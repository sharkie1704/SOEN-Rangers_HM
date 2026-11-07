import { prisma } from "../db/PrismaClient.ts";
import type { WaitingOrder } from "../../domain/dlv/DispatchQueue.ts";
import type { DispatchQueueRepository } from "../../application/dlv/DispatchQueueRepository.ts";

export class PrismaDispatchQueueRepository implements DispatchQueueRepository {
  async listWaiting(): Promise<WaitingOrder[]> {
    const rows = await prisma.order.findMany({
      where: {
        status: "READY",
        assignments: { none: { status: { in: ["OFFERED", "ACCEPTED"] } } },
      },
      select: {
        id: true,
        restaurantId: true,
        placedAt: true,
        restaurant: { select: { name: true } },
        events: { where: { action: "MARK_READY" }, orderBy: { id: "desc" }, take: 1, select: { occurredAt: true } },
      },
    });
    return rows.map((row) => ({
      orderId: row.id,
      restaurantId: row.restaurantId,
      restaurantName: row.restaurant.name,
      readyAt: row.events[0]?.occurredAt ?? row.placedAt,
    }));
  }
}
