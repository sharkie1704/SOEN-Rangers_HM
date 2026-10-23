import { prisma } from "../db/prismaClient.ts";
import { MenuItem, type MenuItemProps } from "../../domain/ord/MenuItem.ts";
import type { MenuItemEvent, MenuRepository } from "../../application/ord/MenuRepository.ts";

type MenuItemRow = {
  id: number;
  restaurantId: string;
  name: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  available: boolean;
};


function toDomain(row: MenuItemRow): MenuItem {
  return new MenuItem(row);
}

export class PrismaMenuRepository implements MenuRepository {
  async nextEventId(): Promise<number> {
    const [row] = await prisma.$queryRaw<{ id: bigint }[]>`SELECT nextval('"MenuItemEvent_id_seq"') AS id`;
    return Number(row.id);
  }

  async add(item: Omit<MenuItemProps, "id">): Promise<MenuItem> {
    return toDomain(await prisma.menuItem.create({ data: item }));
  }

  async save(item: MenuItem): Promise<void> {
    await prisma.menuItem.update({
      where: { id: item.id },
      data: {
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        priceCents: item.priceCents,
        available: item.available,
      },
    });
  }

  async remove(menuItemId: number): Promise<void> {
    await prisma.menuItem.delete({ where: { id: menuItemId } });
  }

  async findById(menuItemId: number): Promise<MenuItem | undefined> {
    const row = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    return row ? toDomain(row) : undefined;
  }

  async findByRestaurant(restaurantId: string): Promise<readonly MenuItem[]> {
    const rows = await prisma.menuItem.findMany({ where: { restaurantId }, orderBy: { id: "asc" } });
    return rows.map(toDomain);
  }

  async recordEvent(event: MenuItemEvent): Promise<void> {
    await prisma.menuItemEvent.create({
      data: {
        id: event.eventId,
        menuItemId: event.menuItemId,
        actorId: event.actorId,
        available: event.available,
        occurredAt: event.occurredAt,
      },
    });
  }
}