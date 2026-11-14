import { prisma } from "../db/PrismaClient.ts";
import type { CourierHistoryEntry, CourierHistoryRepository } from "../../application/dlv/CourierHistoryService.ts";

export class PrismaCourierHistoryRepository implements CourierHistoryRepository {
  async findCompleted(courierId: string): Promise<readonly CourierHistoryEntry[]> {
    const assignments = await prisma.assignment.findMany({
      where: { courierId, status: "COMPLETED", order: { status: { in: ["DELIVERED", "REFUNDED"] } } },
      include: {
        order: {
          include: {
            restaurant: true,
            lines: { orderBy: { position: "asc" } },
            summary: true,
            events: { where: { action: "DELIVER", actorId: courierId }, orderBy: { occurredAt: "desc" }, take: 1 },
          },
        },
        events: { where: { action: "COMPLETE" }, orderBy: { occurredAt: "desc" }, take: 1 },
      },
    });
    // A delivery remains part of the courier's history after a refund.
    const entries = new Map<number, CourierHistoryEntry>();
    for (const { order, events } of assignments) {
      entries.set(order.id, {
        orderId: order.id,
        restaurantId: order.restaurantId,
        restaurantName: order.summary?.restaurantName ?? order.restaurantName ?? order.restaurant.name,
        lines: order.lines.map(({ name, quantity }) => ({ name, quantity })),
        placedAt: order.placedAt,
        deliveredAt: order.summary?.deliveredAt ?? order.events[0]?.occurredAt ?? events[0]?.occurredAt ?? null,
        generatedAt: order.summary?.generatedAt ?? null,
      });
    }
    // Preserve courier payment redaction; never reconstruct historical fares.
    return [...entries.values()].sort((a, b) =>
      (b.deliveredAt?.getTime() ?? b.placedAt.getTime()) - (a.deliveredAt?.getTime() ?? a.placedAt.getTime())
      || b.orderId - a.orderId);
  }
}
