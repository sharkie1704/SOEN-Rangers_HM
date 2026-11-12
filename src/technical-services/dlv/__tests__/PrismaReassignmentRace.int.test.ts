// Separate to keep fast unit tests DB-free

import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CourierAvailabilityService } from "../../../application/dlv/CourierAvailabilityService";
import { ReassignmentService } from "../../../application/dlv/ReassignmentService";
import { Assignment } from "../../../domain/dlv/Assignment";
import { CourierAvailability } from "../../../domain/dlv/CourierAvailability";
import { Role } from "../../../domain/reg/Role";
import { prisma } from "../../db/PrismaClient";
import { PrismaOrderRepository } from "../../ord/PrismaOrderRepository";
import { PrismaAssignmentRepository } from "../PrismaAssignmentRepository";
import { PrismaCourierAvailabilityRepository } from "../PrismaCourierAvailabilityRepository";

const run = !!process.env.DATABASE_URL;
const tag = `it-${Date.now()}`;
const operator = { userId: `${tag}-operator`, role: Role.OPERATOR };

describe.skipIf(!run)("Back on duty vs. reassignment (integration)", () => {
  const couriers = new PrismaCourierAvailabilityRepository();
  const assignments = new PrismaAssignmentRepository();
  const availability = new CourierAvailabilityService(couriers, undefined, assignments);
  // No re-dispatch, so the test never offers its orders to couriers already in the database
  const reassignment = new ReassignmentService(assignments, couriers, new PrismaOrderRepository(), { offer: async () => undefined });
  const restaurantId = `${tag}-restaurant`;
  const orderIds: number[] = [];
  const courierIds: string[] = [];
  let seq = 0;

  // A courier who accepted a ready order and went off duty before pickup
  async function stalledDelivery() {
    seq += 1;
    const courier = await prisma.user.create({
      data: {
        name: `Courier ${seq}`,
        email: `${tag}-${seq}@example.com`,
        passwordHash: "hash",
        role: "COURIER",
        courierStatus: "OFFLINE",
        courierLat: 10,
        courierLng: 10,
      },
    });
    const order = await prisma.order.create({
      data: {
        restaurantId,
        customerId: `${tag}-customer`,
        status: "READY",
        placedAt: new Date(),
        lines: { create: { position: 0, menuItemId: 1, name: "Macaron", quantity: 1, unitPriceCents: 350 } },
        assignments: { create: { courierId: courier.id, status: "ACCEPTED" } },
      },
    });
    courierIds.push(courier.id);
    orderIds.push(order.id);
    return { courierId: courier.id, orderId: order.id, actor: { userId: courier.id, role: Role.COURIER } };
  }

  async function state(courierId: string, orderId: number) {
    const [courier, assignment] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: courierId }, select: { courierStatus: true } }),
      prisma.assignment.findFirstOrThrow({ where: { orderId, courierId }, select: { status: true } }),
    ]);
    return { courier: courier.courierStatus, assignment: assignment.status };
  }

  beforeAll(async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await prisma.restaurant.create({
      data: { id: restaurantId, name: "Test Kitchen", category: "Test", description: "Test", imageUrl: "", lat: 10, lng: 10 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterAll(async () => {
    await prisma.assignment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.courierStatusEvent.deleteMany({ where: { courierId: { in: courierIds } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
    vi.restoreAllMocks();
  });

  it("refuses to resume a delivery the operator released after the courier looked it up", async () => {
    const { courierId, orderId } = await stalledDelivery();
    const courier = (await couriers.findByCourierId(courierId))!;
    await reassignment.reassign(operator, orderId);

    const fromStatus = courier.resumeDelivery();
    await expect(couriers.saveResumedDelivery(courier, {
      eventId: await couriers.nextEventId(),
      courierId,
      actorId: courierId,
      fromStatus,
      toStatus: courier.status,
      occurredAt: new Date(),
    })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await state(courierId, orderId)).toEqual({ courier: "OFFLINE", assignment: "RELEASED" });
  });

  it("brings the courier back idle when the release lands between their lookup and their save", async () => {
    const { courierId, orderId, actor } = await stalledDelivery();
    vi.spyOn(assignments, "findActiveByCourierId").mockImplementationOnce(async () => {
      // The lookup still sees the accepted order, then the operator's release commits
      const stale = new Assignment(orderId, courierId, "Accepted");
      await reassignment.reassign(operator, orderId);
      return stale;
    });

    expect((await availability.goOnDuty(actor)).courier.status).toBe("IDLE");
    expect(await state(courierId, orderId)).toEqual({ courier: "IDLE", assignment: "RELEASED" });
  });

  it("refuses to release an order whose courier came back after the operator's check", async () => {
    const { courierId, orderId, actor } = await stalledDelivery();
    vi.spyOn(couriers, "findByCourierId").mockImplementationOnce(async () => {
      // The operator's check still sees the courier offline, then the courier comes back with the order
      await availability.goOnDuty(actor);
      return new CourierAvailability(courierId, "OFFLINE");
    });

    await expect(reassignment.reassign(operator, orderId)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await state(courierId, orderId)).toEqual({ courier: "ASSIGNED", assignment: "ACCEPTED" });
    const events = await prisma.assignmentEvent.findMany({ where: { assignment: { orderId } } });
    expect(events.map((event) => event.action)).not.toContain("RELEASE");
  });

  it("never leaves a courier assigned without an order when both happen at once", async () => {
    const outcomes = { courierKeptOrder: 0, orderReleased: 0 };
    for (let round = 0; round < 20; round += 1) {
      const { courierId, orderId, actor } = await stalledDelivery();

      // A random head start for one side, so both orderings and the overlaps in between get exercised
      const head = Math.floor(Math.random() * 12);
      const later = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      await Promise.allSettled(round % 2 === 0
        ? [reassignment.reassign(operator, orderId), later(head).then(() => availability.goOnDuty(actor))]
        : [availability.goOnDuty(actor), later(head).then(() => reassignment.reassign(operator, orderId))]);

      const after = await state(courierId, orderId);
      expect([
        { courier: "ASSIGNED", assignment: "ACCEPTED" },
        { courier: "IDLE", assignment: "RELEASED" },
      ]).toContainEqual(after);
      if (after.assignment === "ACCEPTED") outcomes.courierKeptOrder += 1;
      else outcomes.orderReleased += 1;
    }
    console.log(`[race] 20 rounds: courier kept the order ${outcomes.courierKeptOrder}x, order released ${outcomes.orderReleased}x`);
  });
});
