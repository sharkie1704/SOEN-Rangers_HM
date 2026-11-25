import { beforeEach, describe, expect, it, vi } from "vitest";
import { Rating } from "../../../domain/rvw/Rating.ts";
import { PrismaRatingRepository } from "../PrismaRatingRepository.ts";

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  rating: { create: vi.fn() },
}));

vi.mock("../../db/PrismaClient.ts", () => ({
  prisma: { $transaction: (work: (client: typeof tx) => Promise<void>) => work(tx) },
}));

const rating = new Rating({
  orderId: 42, customerId: "customer-a", restaurantId: "restaurant-a", courierId: "courier-a",
  restaurantScore: 1, courierScore: 5,
}, { min: 1, max: 5 });

describe("PrismaRatingRepository.create", () => {
  beforeEach(() => vi.resetAllMocks());

  it("locks and checks the current order status before attempting an insert", async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ status: "REFUNDED" }]);
    await expect(new PrismaRatingRepository().create(rating)).rejects.toMatchObject({
      code: "CONFLICT", message: "Only delivered orders can be rated.",
    });
    const [sql, orderId] = tx.$queryRaw.mock.calls[0];
    expect(sql.join("")).toContain("FOR UPDATE");
    expect(orderId).toBe(42);
    expect(tx.rating.create).not.toHaveBeenCalled();
  });

  it("translates a unique-key collision into a duplicate rating refusal", async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([{ status: "DELIVERED" }])
      .mockResolvedValueOnce([{ id: "courier-a" }]);
    tx.rating.create.mockRejectedValueOnce({ code: "P2002" });

    await expect(new PrismaRatingRepository().create(rating)).rejects.toMatchObject({
      code: "CONFLICT", message: "This order has already been rated.",
    });
    expect(tx.rating.create).toHaveBeenCalledOnce();
  });
});
