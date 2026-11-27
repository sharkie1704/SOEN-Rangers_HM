
import { prisma } from "../db/PrismaClient.ts";
import type {
  RestaurantReadRepository,
  RestaurantDTO,
  MenuItemDTO,
} from "../../application/ord/RestaurantReadRepository.ts";

export class PrismaRestaurantReadRepository implements RestaurantReadRepository {
  async listRestaurants(): Promise<RestaurantDTO[]> {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { name: "asc" },
    });

    const ratingAverages = await prisma.rating.groupBy({
      by: ["restaurantId"],
      _avg: { restaurantScore: true },
      _count: { _all: true },
    });
    const ratingsByRestaurant = new Map(ratingAverages.map((rating) => [rating.restaurantId, rating]));
    return restaurants.map((restaurant) => {
      const rating = ratingsByRestaurant.get(restaurant.id);
      return { ...restaurant, averageRating: rating?._avg.restaurantScore ?? null, ratingCount: rating?._count._all ?? 0 };
    });
  }

  async findRestaurantById(id: string): Promise<RestaurantDTO | undefined> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) return undefined;
    const rating = await prisma.rating.aggregate({
      where: { restaurantId: id },
      _avg: { restaurantScore: true },
      _count: { _all: true },
    });
    return { ...restaurant, averageRating: rating._avg.restaurantScore, ratingCount: rating._count._all };
  }

  async findMenuByRestaurantId(id: string): Promise<MenuItemDTO[]> {
    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: id },
      orderBy: { id: "asc" },
    });

    return menuItems;
  }
}
