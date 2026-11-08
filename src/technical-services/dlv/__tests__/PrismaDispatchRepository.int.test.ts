// Separate to keep fast unit tests DB-free

import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DispatchService } from "../../../application/dlv/DispatchService";
import { Assignment } from "../../../domain/dlv/Assignment";
import { prisma } from "../../db/PrismaClient";
import { PrismaOrderRepository } from "../../ord/PrismaOrderRepository";
import { PrismaAssignmentRepository } from "../PrismaAssignmentRepository";
import { PrismaDispatchRepository } from "../PrismaDispatchRepository";

const run = !!process.env.DATABASE_URL;
const tag = `it-${Date.now()}`;
// Far from the seeded city, so couriers already in the database are never nearer than the test's own
const ORIGIN = { lat: 10, lng: 10 };

describe.skipIf(!run)("PrismaDispatchRepository (integration)", () => {
  const assignments = new PrismaAssignmentRepository();
  const repository = new PrismaDispatchRepository();
  const service = new DispatchService(new PrismaOrderRepository(), assignments, repository);
  const restaurantId = `${tag}-restaurant`;
  const courierIds: string[] = [];
  const orderIds: number[] = [];

  async function courier(name: string, data: { status?: "OFFLINE" | "IDLE" | "ASSIGNED" | "CARRYING"; at?: [number, number] | null }) {
    const position = data.at === undefined ? [ORIGIN.lat + 0.01, ORIGIN.lng] : data.at;
    const row = await prisma.user.create({
      data: {
        name,
        email: `${tag}-${name}@example.com`,
        passwordHash: "hash",
        role: "COURIER",
        courierStatus: data.status ?? "IDLE",
        courierLat: position?.[0] ?? null,
        courierLng: position?.[1] ?? null,
      },
    });
    courierIds.push(row.id);
    return row.id;
  }

  async function readyOrder() {
    const row = await prisma.order.create({
      data: {
        restaurantId,
        customerId: `${tag}-customer`,
        status: "READY",
        placedAt: new Date(),
        lines: { create: { position: 0, menuItemId: 1, name: "Macaron", quantity: 1, unitPriceCents: 350 } },
      },
    });
    orderIds.push(row.id);
    return row.id;
  }

  const candidateIds = async (orderId: number) => (await repository.findCandidates(orderId)).map((c) => c.courierId);
  const activeFor = (courierId: string) => prisma.assignment.findMany({ where: { courierId, status: { in: ["OFFERED", "ACCEPTED"] } } });

  beforeAll(async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await prisma.restaurant.create({
      data: { id: restaurantId, name: "Test Kitchen", category: "Test", description: "Test", imageUrl: "", lat: ORIGIN.lat, lng: ORIGIN.lng },
    });
  });

  afterAll(async () => {
    await prisma.assignment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
    vi.restoreAllMocks();
  });

  it("finds the restaurant's position, or nothing for an unknown restaurant", async () => {
    expect(await repository.findRestaurantPosition(restaurantId)).toEqual(ORIGIN);
    expect(await repository.findRestaurantPosition(`${tag}-missing`)).toBeUndefined();
  });

  it("lists only idle couriers with a position who are free for this order", async () => {
    const orderId = await readyOrder();
    const otherOrder = await readyOrder();
    const idle = await courier("idle", {});
    const offline = await courier("offline", { status: "OFFLINE" });
    const carrying = await courier("carrying", { status: "CARRYING" });
    const nowhere = await courier("nowhere", { at: null });
    const offered = await courier("offered", {});
    const declined = await courier("declined", {});
    const declinedOther = await courier("declined-other", {});
    await prisma.assignment.createMany({
      data: [
        { orderId: otherOrder, courierId: offered, status: "OFFERED" },
        { orderId, courierId: declined, status: "DECLINED" },
        { orderId: otherOrder, courierId: declinedOther, status: "DECLINED" },
      ],
    });

    const ids = await candidateIds(orderId);
    expect(ids).toEqual(expect.arrayContaining([idle, declinedOther]));
    for (const excluded of [offline, carrying, nowhere, offered, declined]) expect(ids).not.toContain(excluded);
    const found = (await repository.findCandidates(orderId)).find((c) => c.courierId === idle);
    expect(found?.position).toEqual({ lat: ORIGIN.lat + 0.01, lng: ORIGIN.lng });
  });

  it("offers a ready order to the nearest courier and records the offer event", async () => {
    const orderId = await readyOrder();
    await courier("dispatch-far", { at: [ORIGIN.lat + 0.02, ORIGIN.lng] });
    const near = await courier("dispatch-near", { at: [ORIGIN.lat + 0.001, ORIGIN.lng] });

    const assignment = await service.offer(orderId);

    expect(assignment?.courierId).toBe(near);
    const row = await prisma.assignment.findFirstOrThrow({ where: { orderId }, include: { events: true } });
    expect(row).toMatchObject({ courierId: near, status: "OFFERED" });
    expect(row.events).toEqual([expect.objectContaining({ action: "OFFER" })]);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: near } })).courierStatus).toBe("IDLE");
  });

  it("never gives one courier two offers, even when two orders are dispatched at once", async () => {
    // Nearer than every other test courier, so both orders want this one
    const only = await courier("race", { at: [ORIGIN.lat, ORIGIN.lng + 0.0001] });
    const [first, second] = [await readyOrder(), await readyOrder()];

    const results = await Promise.all([service.offer(first), service.offer(second)]);

    expect(await activeFor(only)).toHaveLength(1);
    expect(results.filter((a) => a?.courierId === only)).toHaveLength(1);
  });

  it("turns a second active offer for a courier into a conflict", async () => {
    const busy = await courier("conflict", {});
    const [first, second] = [await readyOrder(), await readyOrder()];
    const event = (orderId: number) => ({ eventId: 0, orderId, courierId: busy, occurredAt: new Date() });

    await assignments.saveOffer(new Assignment(first, busy), { ...event(first), eventId: await assignments.nextEventId() });
    await expect(assignments.saveOffer(new Assignment(second, busy), { ...event(second), eventId: await assignments.nextEventId() }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    expect(await activeFor(busy)).toHaveLength(1);
  });
});
