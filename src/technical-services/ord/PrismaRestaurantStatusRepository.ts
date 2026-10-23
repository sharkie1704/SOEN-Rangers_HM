import { prisma } from "../db/prismaClient.ts";
import { Restaurant } from "../../domain/ord/Restaurant.ts";
import { OrderError } from "../../domain/ord/OrderError.ts";
import type { RestaurantStatusEvent, RestaurantStatusRepository } from "../../application/ord/RestaurantStatusRepository.ts";

export class PrismaRestaurantStatusRepository implements RestaurantStatusRepository {
  async nextEventId(): Promise<number> {
    const [row] = await prisma.$queryRaw<{ id: bigint }[]>`SELECT nextval('"RestaurantStatusEvent_id_seq"') AS id`;
    return Number(row.id);
  }

  async findById(restaurantId: string): Promise<Restaurant | undefined> {
    const row = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true, status: true } });
    return row ? new Restaurant(row.id, row.status) : undefined;
  }

  async save(restaurant: Restaurant, event: RestaurantStatusEvent): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Only apply the change if nobody else moved the restaurant since it was loaded
      const { count } = await tx.restaurant.updateMany({
        where: { id: restaurant.id, status: event.fromStatus },
        data: { status: restaurant.status },
      });
      if (count === 0) {
        throw new OrderError("CONFLICT", "Restaurant status was changed by someone else. Reload it and try again.");
      }
      await tx.restaurantStatusEvent.create({
        data: {
          id: event.eventId,
          restaurantId: event.restaurantId,
          actorId: event.actorId,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          occurredAt: event.occurredAt,
        },
      });
    });
  }
}