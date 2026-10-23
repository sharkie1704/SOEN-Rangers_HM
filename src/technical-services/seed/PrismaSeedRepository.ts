import { prisma } from "../db/prismaClient";
import type { SeedAccountRecord, SeedRestaurant } from "../../application/seed/SeedData";
import type { SeedRepository } from "../../application/seed/SeedRepository";

export class PrismaSeedRepository implements SeedRepository {
  async seed(data: { accounts: SeedAccountRecord[]; restaurants: SeedRestaurant[] }): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      for (const account of data.accounts) {
        const accountData = {
          name: account.name,
          passwordHash: account.passwordHash,
          role: account.role,
          deliveryLat: account.deliveryLat,
          deliveryLng: account.deliveryLng,
          restaurantId: account.restaurantId,
        };

        await transaction.user.upsert({
          where: { email: account.email },
          create: {
            id: account.id,
            email: account.email,
            ...accountData,
          },
          update: accountData,
        });
      }

      for (const restaurant of data.restaurants) {
        const { menuItems, ...restaurantData } = restaurant;
        await transaction.restaurant.upsert({
          where: { id: restaurant.id },
          create: restaurantData,
          update: restaurantData,
        });

        for (const menuItem of menuItems) {
          const existing = await transaction.menuItem.findFirst({
            where: { restaurantId: restaurant.id, name: menuItem.name },
            select: { id: true },
          });

          if (existing) {
            await transaction.menuItem.update({
              where: { id: existing.id },
              data: menuItem,
            });
          } else {
            await transaction.menuItem.create({
              data: { ...menuItem, restaurantId: restaurant.id },
            });
          }
        }
      }
    });
  }
}
