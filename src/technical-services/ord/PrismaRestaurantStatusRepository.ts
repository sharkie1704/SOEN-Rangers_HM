import { prisma } from "../db/prismaClient.ts";
import { Restaurant } from "../../domain/ord/Restaurant.ts";
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

  async save(restaurant: Restaurant): Promise<void> {
    await prisma.restaurant.update({ where: { id: restaurant.id }, data: { status: restaurant.status } });
  }

  async recordEvent(event: RestaurantStatusEvent): Promise<void> {
    await prisma.restaurantStatusEvent.create({
      data: {
        id: event.eventId,
        restaurantId: event.restaurantId,
        actorId: event.actorId,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        occurredAt: event.occurredAt,
      },
    });
  }
}