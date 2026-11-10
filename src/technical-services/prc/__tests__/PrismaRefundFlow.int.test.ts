import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Assignment } from "../../../domain/dlv/Assignment.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { AssignmentService } from "../../../application/dlv/AssignmentService.ts";
import { HandoffService } from "../../../application/dlv/HandoffService.ts";
import { OrderService } from "../../../application/ord/OrderService.ts";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const run = process.env.RUN_DATABASE_INTEGRATION_TESTS === "1" && Boolean(testDatabaseUrl);
const tag = `refund-it-${Date.now()}`;

if (run) {
  process.env.DATABASE_URL = testDatabaseUrl;
}

const dependencies = run
  ? await Promise.all([
    import("../../db/PrismaClient.ts"),
    import("../../dlv/PrismaAssignmentRepository.ts"),
    import("../../dlv/PrismaCourierAvailabilityRepository.ts"),
    import("../../ord/PrismaMenuCatalog.ts"),
    import("../../ord/PrismaOrderRepository.ts"),
    import("../PrismaPricingSettingsRepository.ts"),
  ])
  : null;

describe.skipIf(!run)("Prisma refund workflow (integration)", () => {
  if (!dependencies) return;
  const [{ prisma }, { PrismaAssignmentRepository }, { PrismaCourierAvailabilityRepository }, { PrismaMenuCatalog }, { PrismaOrderRepository }, { PrismaPricingSettingsRepository }] = dependencies;
  const restaurantId = `${tag}-restaurant`;
  let menuItemId = 0;
  let courierId = "";
  let orderId = 0;

  const orders = new PrismaOrderRepository();
  const assignments = new PrismaAssignmentRepository();
  const couriers = new PrismaCourierAvailabilityRepository();
  const orderService = new OrderService(orders, new PrismaMenuCatalog(), new PrismaPricingSettingsRepository());

  beforeAll(async () => {
    await prisma.restaurant.create({
      data: {
        id: restaurantId,
        name: "Refund Test Bakery",
        category: "Test",
        description: "Integration test restaurant",
        imageUrl: "",
      },
    });
    const menuItem = await prisma.menuItem.create({
      data: {
        restaurantId,
        name: "Refund Test Brownie",
        description: "Integration test item",
        imageUrl: "",
        priceCents: 450,
      },
    });
    menuItemId = menuItem.id;
    const courier = await prisma.user.create({
      data: {
        name: "Refund Test Courier",
        email: `${tag}@example.com`,
        passwordHash: "integration-test",
        role: "COURIER",
        courierStatus: "IDLE",
        courierLat: 45,
        courierLng: -73,
      },
    });
    courierId = courier.id;
  });

  afterAll(async () => {
    if (orderId > 0) {
      // Ledger entries are intentionally append-only; leave audit rows intact.
      await prisma.assignment.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    if (courierId) await prisma.user.deleteMany({ where: { id: courierId } });
    if (menuItemId) await prisma.menuItem.deleteMany({ where: { id: menuItemId } });
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  it("persists pricing, delivery summary, refund state, and refund ledger entry", async () => {
    const placed = await orderService.place(
      { userId: `${tag}-customer`, role: Role.CUSTOMER },
      { restaurantId, lines: [{ menuItemId, quantity: 1 }] },
    );
    orderId = placed.id;

    await orderService.accept({ userId: `${tag}-staff`, role: Role.RESTAURANT, restaurantId }, orderId);
    await orderService.markReady({ userId: `${tag}-staff`, role: Role.RESTAURANT, restaurantId }, orderId);

    const assignment = new Assignment(orderId, courierId);
    await assignments.saveOffer(assignment, {
      eventId: await assignments.nextEventId(),
      orderId,
      courierId,
      occurredAt: new Date(),
    });
    await new AssignmentService(assignments, couriers).accept({ userId: courierId, role: Role.COURIER }, orderId);

    const handoff = new HandoffService(assignments, couriers, orders);
    await handoff.pickUp({ userId: courierId, role: Role.COURIER }, orderId);
    const delivered = await handoff.deliver({ userId: courierId, role: Role.COURIER }, orderId);

    expect(delivered.order.status).toBe("Delivered");
    expect((await prisma.orderSummary.findUnique({ where: { orderId } }))?.totalCents).toBe(placed.fare.totalCents);

    const refunded = await orderService.refund({ userId: `${tag}-operator`, role: Role.OPERATOR }, orderId);
    expect(refunded.order.status).toBe("Refunded");

    const ledgerEntries = await prisma.ledgerEntry.findMany({ where: { orderId }, orderBy: { eventId: "asc" } });
    expect(ledgerEntries.map((entry) => entry.finalState)).toEqual(["DELIVERED", "REFUNDED"]);
    expect(ledgerEntries.at(-1)).toMatchObject({ finalState: "REFUNDED", totalChargeCents: 0, deliveredAt: null });
  });
});
