import { prisma } from "./PrismaClient";
import { prepareSeed, seedDatabase } from "./SeedDatabase";

export async function resetDatabase(): Promise<void> {
  const prepared = await prepareSeed();

  await prisma.$transaction(
    async (tx) => {
      await tx.assignmentEvent.deleteMany();
      await tx.assignment.deleteMany();
      await tx.orderSummary.deleteMany();
      await tx.$executeRaw`DELETE FROM "LedgerEntry"`;
      await tx.$executeRaw`DELETE FROM "LedgerState"`;
      await tx.orderEvent.deleteMany();
      await tx.orderLine.deleteMany();
      await tx.order.deleteMany();
      await tx.menuItemEvent.deleteMany();
      await tx.restaurantStatusEvent.deleteMany();
      await tx.courierStatusEvent.deleteMany();
      await tx.menuItem.deleteMany();
      await tx.restaurant.deleteMany();
      await tx.pricingSettings.deleteMany();
      await tx.user.deleteMany();

      await seedDatabase(tx, prepared);
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
}