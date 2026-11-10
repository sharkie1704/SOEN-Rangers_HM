import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Assignment } from "../../../domain/dlv/Assignment.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { AssignmentService } from "../../../application/dlv/AssignmentService.ts";
import { HandoffService } from "../../../application/dlv/HandoffService.ts";
import { OrderService } from "../../../application/ord/OrderService.ts";
import { PrismaAssignmentRepository } from "../../dlv/PrismaAssignmentRepository.ts";
import { PrismaCourierAvailabilityRepository } from "../../dlv/PrismaCourierAvailabilityRepository.ts";
import { PrismaOrderRepository } from "../../ord/PrismaOrderRepository.ts";
import { PrismaMenuCatalog } from "../../ord/PrismaMenuCatalog.ts";
import { prisma } from "../../db/PrismaClient.ts";
import { PrismaPricingSettingsRepository } from "../PrismaPricingSettingsRepository.ts";

const run = !!process.env.DATABASE_URL;
const tag = `refund-it-${Date.now()}`;

describe.skipIf(!run)("Prisma refund workflow (integration)", () => {
  const restaurantId = `${tag}-restaurant`;
  let menuItemId: number;
  let courierId: string;
  let orderId: number;

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
    if (orderId) {
      // Ledger entries are intentionally append-only; leave audit rows intact.
      await prisma.assignment.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    await prisma.user.deleteMany({ where: { id: courierId } });
    await prisma.menuItem.deleteMany({ where: { id: menuItemId } });
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
    expect((await prisma.orderSummary.findUnique({ where: { orderId } }))?.totalCents).toBe(1100);

    const refunded = await orderService.refund({ userId: `${tag}-operator`, role: Role.OPERATOR }, orderId);
    expect(refunded.order.status).toBe("Refunded");

    const ledgerEntries = await prisma.ledgerEntry.findMany({ where: { orderId }, orderBy: { eventId: "asc" } });
    expect(ledgerEntries.map((entry) => entry.finalState)).toEqual(["DELIVERED", "REFUNDED"]);
    expect(ledgerEntries.at(-1)).toMatchObject({ finalState: "REFUNDED", totalChargeCents: 0, deliveredAt: null });
  });
});
