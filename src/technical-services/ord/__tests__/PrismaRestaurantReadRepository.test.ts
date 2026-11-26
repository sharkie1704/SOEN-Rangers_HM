import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaRestaurantReadRepository } from "../PrismaRestaurantReadRepository.ts";

const prisma = vi.hoisted(() => ({
  restaurant: { findMany: vi.fn(), findUnique: vi.fn() },
  rating: { groupBy: vi.fn(), aggregate: vi.fn() },
}));

vi.mock("../../db/PrismaClient.ts", () => ({ prisma }));

const restaurant = {
  id: "restaurant-a", name: "Bakery", category: "Dessert", description: "", imageUrl: "",
  status: "OPEN", lat: null, lng: null,
};

describe("PrismaRestaurantReadRepository rating summaries", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns the average and count of several stored ratings", async () => {
    const scores = [5, 4, 2, 5];
    prisma.restaurant.findUnique.mockResolvedValueOnce(restaurant);
    prisma.rating.aggregate.mockResolvedValueOnce({
      _avg: { restaurantScore: scores.reduce((sum, score) => sum + score, 0) / scores.length },
      _count: { _all: scores.length },
    });

    await expect(new PrismaRestaurantReadRepository().findRestaurantById(restaurant.id)).resolves.toMatchObject({
      averageRating: 4,
      ratingCount: 4,
    });
    expect(prisma.rating.aggregate).toHaveBeenCalledWith({
      where: { restaurantId: restaurant.id },
      _avg: { restaurantScore: true },
      _count: { _all: true },
    });
  });

  it("returns no rating instead of zero when a restaurant has no ratings", async () => {
    prisma.restaurant.findUnique.mockResolvedValueOnce(restaurant);
    prisma.rating.aggregate.mockResolvedValueOnce({
      _avg: { restaurantScore: null },
      _count: { _all: 0 },
    });

    await expect(new PrismaRestaurantReadRepository().findRestaurantById(restaurant.id)).resolves.toMatchObject({
      averageRating: null,
      ratingCount: 0,
    });
  });

  it("does not query ratings for an unknown restaurant", async () => {
    prisma.restaurant.findUnique.mockResolvedValueOnce(null);

    await expect(new PrismaRestaurantReadRepository().findRestaurantById("missing")).resolves.toBeUndefined();
    expect(prisma.rating.aggregate).not.toHaveBeenCalled();
  });
});
