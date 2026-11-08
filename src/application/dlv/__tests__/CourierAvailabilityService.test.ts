import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourierAvailability } from "../../../domain/dlv/CourierAvailability.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { CourierAvailabilityService, type CourierActor } from "../CourierAvailabilityService.ts";
import { InMemoryCourierAvailabilityRepository } from "./fakes.ts";

const courier: CourierActor = { userId: "courier-1", role: Role.COURIER };

let repository: InMemoryCourierAvailabilityRepository;
let service: CourierAvailabilityService;

beforeEach(() => {
  repository = new InMemoryCourierAvailabilityRepository().withCourier("courier-1");
  service = new CourierAvailabilityService(repository);
});

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("Courier availability (US-DLV-01)", () => {
  it("returns the courier's current status", async () => {
    repository.withCourier("courier-1", "CARRYING");
    expect((await service.get(courier)).status).toBe("CARRYING");
  });

  it("goes on duty and records the event", async () => {
    const { courier: updated, eventId } = await service.goOnDuty(courier);
    expect(updated.status).toBe("IDLE");
    expect(repository.statuses.get("courier-1")).toBe("IDLE");
    expect(repository.events).toEqual([expect.objectContaining({
      eventId, courierId: "courier-1", actorId: "courier-1", fromStatus: "OFFLINE", toStatus: "IDLE",
    })]);
  });

  it("goes off duty and records the event", async () => {
    repository.withCourier("courier-1", "IDLE");
    const { courier: updated } = await service.goOffDuty(courier);
    expect(updated.status).toBe("OFFLINE");
    expect(repository.events.at(-1)).toEqual(expect.objectContaining({ fromStatus: "IDLE", toStatus: "OFFLINE" }));
  });

  it.each(["CARRYING"] as const)("refuses to go offline while %s", async (status) => {
    repository.withCourier("courier-1", status);
    await expectCode(service.goOffDuty(courier), "INVALID_TRANSITION");
    expect(repository.statuses.get("courier-1")).toBe(status);
    expect(repository.events).toEqual([]);
  });

  it("refuses to go on duty twice", async () => {
    await service.goOnDuty(courier);
    await expectCode(service.goOnDuty(courier), "INVALID_TRANSITION");
    expect(repository.events).toHaveLength(1);
  });

  it("does not overwrite a status that changed after the courier was loaded", async () => {
    repository.withCourier("courier-1", "ASSIGNED");
    vi.spyOn(repository, "findByCourierId").mockResolvedValueOnce(new CourierAvailability("courier-1", "IDLE"));
    await expectCode(service.goOffDuty(courier), "CONFLICT");
    expect(repository.statuses.get("courier-1")).toBe("ASSIGNED");
    expect(repository.events).toEqual([]);
  });

  it("is forbidden without a session or for other roles", async () => {
    await expectCode(service.goOnDuty(null), "FORBIDDEN");
    for (const role of [Role.CUSTOMER, Role.RESTAURANT, Role.OPERATOR]) {
      await expectCode(service.get({ userId: "courier-1", role }), "FORBIDDEN");
      await expectCode(service.goOnDuty({ userId: "courier-1", role }), "FORBIDDEN");
    }
    expect(repository.statuses.get("courier-1")).toBe("OFFLINE");
  });

  it("reports a courier that does not exist", async () => {
    await expectCode(service.get({ userId: "missing", role: Role.COURIER }), "NOT_FOUND");
  });
});
