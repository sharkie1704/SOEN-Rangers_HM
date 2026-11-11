import { prisma } from "./PrismaClient";
import { prepareSeed, seedDatabase } from "./SeedDatabase";

export async function resetDatabase(): Promise<void> {
  const prepared = await prepareSeed();

  await prisma.$transaction(
    async (tx) => {
      await tx.assignmentEvent.deleteMany();
      await tx.assignment.deleteMany();
      await tx.orderSummary.deleteMany();
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

      // Ledger entries are immutable audit history. A reset only starts a new
      // visible epoch; keep the singleton state row for future ledger writes.
      await tx.ledgerState.update({
        where: { id: "default" },
        data: { epoch: { increment: 1 } },
      });

      await seedDatabase(tx, prepared);
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
}
