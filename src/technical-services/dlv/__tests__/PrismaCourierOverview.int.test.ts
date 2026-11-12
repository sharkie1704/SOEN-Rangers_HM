// Separate to keep fast unit tests DB-free

import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db/PrismaClient";
import { PrismaCourierAvailabilityRepository } from "../PrismaCourierAvailabilityRepository";

const run = !!process.env.DATABASE_URL;
const tag = `it-${Date.now()}-overview`;

describe.skipIf(!run)("PrismaCourierAvailabilityRepository.listOverview (integration)", () => {
  const couriers = new PrismaCourierAvailabilityRepository();
  const ids: Record<string, string> = {};
  const restaurantId = `${tag}-restaurant`;
  let orderId = 0;

  async function courier(key: string, courierStatus: "OFFLINE" | "IDLE" | "ASSIGNED" | "CARRYING", at?: [number, number]) {
    const row = await prisma.user.create({
      data: {
        name: `${tag} ${key}`,
        email: `${tag}-${key}@example.com`,
        passwordHash: "hash",
        role: "COURIER",
        courierStatus,
        courierLat: at?.[0] ?? null,
        courierLng: at?.[1] ?? null,
      },
    });
    ids[key] = row.id;
  }

  beforeAll(async () => {
    await courier("free", "IDLE", [10, 10]);
    await courier("offered", "IDLE", [10, 10.1]);
    await courier("nowhere", "IDLE");
    await courier("off", "OFFLINE", [10, 10.2]);
    await prisma.restaurant.create({
      data: { id: restaurantId, name: "Test Kitchen", category: "Test", description: "Test", imageUrl: "", lat: 10, lng: 10 },
    });
    orderId = (await prisma.order.create({
      data: {
        restaurantId,
        customerId: `${tag}-customer`,
        status: "READY",
        placedAt: new Date(),
        assignments: { create: { courierId: ids.offered, status: "OFFERED" } },
      },
    })).id;
    await prisma.user.create({
      data: { name: `${tag} customer`, email: `${tag}-customer@example.com`, passwordHash: "hash", role: "CUSTOMER", deliveryLat: 1, deliveryLng: 1 },
    });
  });

  afterAll(async () => {
    await prisma.assignment.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  it("lists every courier with status, availability, position and active order, and no other roles", async () => {
    const mine = (await couriers.listOverview()).filter((c) => c.name.startsWith(tag));
    expect(mine).toEqual([
      { id: ids.free, name: `${tag} free`, status: "IDLE", onDuty: true, available: true, location: { lat: 10, lng: 10 }, activeOrderId: null },
      { id: ids.nowhere, name: `${tag} nowhere`, status: "IDLE", onDuty: true, available: false, location: null, activeOrderId: null },
      { id: ids.off, name: `${tag} off`, status: "OFFLINE", onDuty: false, available: false, location: { lat: 10, lng: 10.2 }, activeOrderId: null },
      { id: ids.offered, name: `${tag} offered`, status: "IDLE", onDuty: true, available: false, location: { lat: 10, lng: 10.1 }, activeOrderId: orderId },
    ]);
  });
});
