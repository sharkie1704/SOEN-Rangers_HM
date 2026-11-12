// Separate to keep fast unit tests DB-free

import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { CourierAvailabilityService } from "../../../application/dlv/CourierAvailabilityService";
import { ReassignmentService } from "../../../application/dlv/ReassignmentService";
import { Role } from "../../../domain/reg/Role";
import { prisma } from "../../db/PrismaClient";
import { PrismaOrderRepository } from "../../ord/PrismaOrderRepository";
import { PrismaAssignmentRepository } from "../PrismaAssignmentRepository";
import { PrismaCourierAvailabilityRepository } from "../PrismaCourierAvailabilityRepository";

// Its own prefix: other files tag rows it-<timestamp>, and their cleanup would delete these if the times matched
const tag = `race-it-${Date.now()}`;

describe.skipIf(!process.env.DATABASE_URL)("Courier reassignment race and overview (integration)", () => {
  const couriers = new PrismaCourierAvailabilityRepository();
  const assignments = new PrismaAssignmentRepository();
  const availability = new CourierAvailabilityService(couriers, undefined, assignments);
  // No re-dispatch, so orders are never offered to couriers already in the database
  const reassignment = new ReassignmentService(assignments, couriers, new PrismaOrderRepository(), { offer: async () => undefined });
  const operator = { userId: "op", role: Role.OPERATOR };

  // A courier who accepted a ready order, then went off duty before pickup.
  // Placed far from the dispatch test's couriers, so running in parallel the two never pick each other's.
  async function stalled(n: number) {
    await prisma.restaurant.upsert({ where: { id: tag }, update: {}, create: { id: tag, name: tag, category: "", description: "", imageUrl: "" } });
    const courier = await prisma.user.create({
      data: { name: `${tag} ${n}`, email: `${tag}-${n}@example.com`, passwordHash: "x", role: "COURIER", courierStatus: "OFFLINE", courierLat: -10, courierLng: -10 },
    });
    const order = await prisma.order.create({
      data: {
        restaurantId: tag, customerId: tag, status: "READY", placedAt: new Date(),
        lines: { create: { position: 0, menuItemId: 1, name: "Macaron", quantity: 1, unitPriceCents: 350 } },
        assignments: { create: { courierId: courier.id, status: "ACCEPTED" } },
      },
    });
    return { courierId: courier.id, orderId: order.id };
  }

  afterAll(async () => {
    const ids = (await prisma.user.findMany({ where: { email: { startsWith: tag } }, select: { id: true } })).map((u) => u.id);
    await prisma.assignment.deleteMany({ where: { order: { customerId: tag } } });
    await prisma.order.deleteMany({ where: { customerId: tag } });
    await prisma.restaurant.deleteMany({ where: { id: tag } });
    await prisma.courierStatusEvent.deleteMany({ where: { courierId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("never leaves a courier assigned without an order when both act at once", async () => {
    for (let n = 0; n < 20; n += 1) {
      const { courierId, orderId } = await stalled(n);
      const actions: (() => Promise<unknown>)[] = [
        () => reassignment.reassign(operator, orderId),
        () => availability.goOnDuty({ userId: courierId, role: Role.COURIER }),
      ];
      if (n % 2) actions.reverse();
      // A random head start, so both orderings and the overlaps between them happen
      const results = await Promise.allSettled([actions[0](), new Promise((r) => setTimeout(r, Math.random() * 12)).then(actions[1])]);

      const courier = (await prisma.user.findUniqueOrThrow({ where: { id: courierId } })).courierStatus;
      const assignment = (await prisma.assignment.findFirstOrThrow({ where: { orderId } })).status;
      const errors = results.flatMap((r) => (r.status === "rejected" ? [String(r.reason)] : []));
      expect([["ASSIGNED", "ACCEPTED"], ["IDLE", "RELEASED"]], `round ${n}: ${errors.join(" | ")}`).toContainEqual([courier, assignment]);
    }
  });

  it("lists a courier's status, availability, position and order for the operator", async () => {
    const { courierId, orderId } = await stalled(99);
    const entry = (await couriers.listOverview()).find((c) => c.id === courierId);
    expect(entry).toEqual({ id: courierId, name: `${tag} 99`, status: "OFFLINE", onDuty: false, available: false, location: { lat: -10, lng: -10 }, activeOrderId: orderId });
  });
});
