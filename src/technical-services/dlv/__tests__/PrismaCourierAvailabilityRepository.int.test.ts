// Separate to keep fast unit tests DB-free

import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { CourierAvailabilityService } from "../../../application/dlv/CourierAvailabilityService";
import { CourierRegistrar } from "../../../domain/reg/CourierRegistrar";
import { CustomerRegistrar } from "../../../domain/reg/CustomerRegistrar";
import { Role } from "../../../domain/reg/Role";
import { prisma } from "../../db/PrismaClient";
import { BcryptPasswordHasher } from "../../reg/BcryptPasswordHasher";
import { PrismaUserRepository } from "../../reg/PrismaUserRepository";
import { PrismaCourierAvailabilityRepository } from "../PrismaCourierAvailabilityRepository";

const run = !!process.env.DATABASE_URL;
const tag = `it-${Date.now()}`;
const email = (n: string) => `${tag}-${n}@example.com`;

describe.skipIf(!run)("PrismaCourierAvailabilityRepository (integration)", () => {
  const users = new PrismaUserRepository();
  const repository = new PrismaCourierAvailabilityRepository();
  const service = new CourierAvailabilityService(repository);
  const ids: string[] = [];

  async function registerCourier(name: string) {
    const user = await new CourierRegistrar(users, new BcryptPasswordHasher(4))
      .register({ name, email: email(name), password: "password123" });
    ids.push(user.id);
    return { userId: user.id, role: Role.COURIER };
  }

  afterAll(async () => {
    await prisma.courierStatusEvent.deleteMany({ where: { courierId: { in: ids } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  it("starts a registered courier off duty, and saving the account keeps a later status", async () => {
    const actor = await registerCourier("start");
    expect((await service.get(actor)).status).toBe("OFFLINE");

    await service.goOnDuty(actor);
    const account = await users.findById(actor.userId);
    await users.save(account!);
    expect((await service.get(actor)).status).toBe("IDLE");
  });

  it("saves transitions together with their events", async () => {
    const actor = await registerCourier("events");
    const { eventId } = await service.goOnDuty(actor);
    await service.goOffDuty(actor);

    const events = await prisma.courierStatusEvent.findMany({ where: { courierId: actor.userId }, orderBy: { id: "asc" } });
    expect(events.map((event) => [event.fromStatus, event.toStatus])).toEqual([["OFFLINE", "IDLE"], ["IDLE", "OFFLINE"]]);
    expect(events[0]).toMatchObject({ id: eventId, actorId: actor.userId });
  });

  it("refuses a stale change and records no event", async () => {
    const actor = await registerCourier("stale");
    await service.goOnDuty(actor);
    const stale = (await repository.findByCourierId(actor.userId))!;
    await prisma.user.update({ where: { id: actor.userId }, data: { courierStatus: "ASSIGNED" } });

    const fromStatus = stale.goOffDuty();
    await expect(repository.save(stale, {
      eventId: await repository.nextEventId(),
      courierId: actor.userId,
      actorId: actor.userId,
      fromStatus,
      toStatus: stale.status,
      occurredAt: new Date(),
    })).rejects.toMatchObject({ code: "CONFLICT" });

    expect((await repository.findByCourierId(actor.userId))?.status).toBe("ASSIGNED");
    expect(await prisma.courierStatusEvent.count({ where: { courierId: actor.userId } })).toBe(1);
  });

  it("refuses to store a courier without a status", async () => {
    const actor = await registerCourier("required");
    await expect(prisma.user.update({ where: { id: actor.userId }, data: { courierStatus: null } })).rejects.toThrow();
    await expect(prisma.user.create({
      data: { name: "No Status", email: email("no-status"), passwordHash: "hash", role: "COURIER" },
    })).rejects.toThrow();
    expect((await repository.findByCourierId(actor.userId))?.status).toBe("OFFLINE");
  });

  it("does not treat other roles as couriers", async () => {
    const customer = await new CustomerRegistrar(users, new BcryptPasswordHasher(4))
      .register({ name: "Cu", email: email("customer"), password: "password123", address: { lat: 45.5, lng: -73.57 } });
    expect(await repository.findByCourierId(customer.id)).toBeUndefined();
    expect(await repository.findByCourierId("no-such-user")).toBeUndefined();
  });
});
