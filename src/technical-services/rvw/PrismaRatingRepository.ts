import type { RatingRepository } from "../../application/rvw/RatingRepository.ts";
import { OrderError } from "../../domain/ord/OrderError.ts";
import type { Rating } from "../../domain/rvw/Rating.ts";
import { prisma } from "../db/PrismaClient.ts";

export class PrismaRatingRepository implements RatingRepository {
  async existsForOrder(orderId: number): Promise<boolean> {
    return (await prisma.rating.findUnique({ where: { orderId }, select: { orderId: true } })) !== null;
  }

  async findRatedOrderIds(customerId: string): Promise<readonly number[]> {
    const rows = await prisma.rating.findMany({
      where: { customerId },
      select: { orderId: true },
      orderBy: { orderId: "asc" },
    });
    return rows.map(({ orderId }) => orderId);
  }

  async averageCourierScore(courierId: string): Promise<{ readonly average: number; readonly count: number } | null> {
    const result = await prisma.rating.aggregate({
      where: { courierId },
      _avg: { courierScore: true },
      _count: { _all: true },
    });
    return result._avg.courierScore === null ? null : {
      average: result._avg.courierScore,
      count: result._count._all,
    };
  }

  async create(rating: Rating): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Refunds update this same order row. Hold its lock through the insert.
        const [order] = await tx.$queryRaw<{ status: string }[]>`
          SELECT "status"::text AS "status"
          FROM "Order" WHERE "id" = ${rating.orderId} FOR UPDATE
        `;
        if (!order) throw new OrderError("NOT_FOUND", "Order was not found.");
        if (order.status !== "DELIVERED") {
          throw new OrderError("CONFLICT", "Only delivered orders can be rated.");
        }

        const [courier] = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "User"
          WHERE "id" = ${rating.courierId} AND "role" = 'COURIER' FOR SHARE
        `;
        if (!courier) {
          throw new OrderError("CONFLICT", "The courier who delivered this order could not be verified.");
        }

        await tx.rating.create({
          data: {
            orderId: rating.orderId,
            customerId: rating.customerId,
            restaurantId: rating.restaurantId,
            courierId: rating.courierId,
            restaurantScore: rating.restaurantScore,
            courierScore: rating.courierScore,
            createdAt: rating.createdAt,
          },
        });
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        throw new OrderError("CONFLICT", "This order has already been rated.");
      }
      throw error;
    }
  }
}
