import { prisma } from "../db/PrismaClient.ts";
import type { CatalogMenuItem, CatalogRestaurant, MenuCatalog } from "../../application/ord/MenuCatalog.ts";

export class PrismaMenuCatalog implements MenuCatalog {
  async findRestaurant(restaurantId: string): Promise<CatalogRestaurant | undefined> {
    const row = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true, status: true } });
    // PAUSED and CLOSED restaurants do not take orders
    return row ? { restaurantId: row.id, isOpen: row.status === "OPEN" } : undefined;
  }

  async findMenuItem(menuItemId: number): Promise<CatalogMenuItem | undefined> {
    const row = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    return row
      ? {
        menuItemId: row.id,
        restaurantId: row.restaurantId,
        name: row.name,
        unitPriceCents: row.priceCents,
        available: row.available,
      }
      : undefined;
  }
}
