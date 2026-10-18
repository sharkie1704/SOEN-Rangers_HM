
import { prisma } from "../db/prismaClient.ts";
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

    return restaurants;
  }

  async findRestaurantById(id: string): Promise<RestaurantDTO | undefined> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
    });

    return restaurant ?? undefined;
  }

  async findMenuByRestaurantId(id: string): Promise<MenuItemDTO[]> {
    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: id },
      orderBy: { id: "asc" },
    });

    return menuItems;
  }
}
