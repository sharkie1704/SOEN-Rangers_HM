import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "../../../domain/reg/Role.ts";
import { RestaurantStatusService, type StatusActor } from "../RestaurantStatusService.ts";
import { InMemoryRestaurantStatusRepository } from "./fakes.ts";

const staffA: StatusActor = { userId: "staff-a", role: Role.RESTAURANT, restaurantId: "rest-a" };
const staffB: StatusActor = { userId: "staff-b", role: Role.RESTAURANT, restaurantId: "rest-b" };
const operator: StatusActor = { userId: "op-1", role: Role.OPERATOR };

let repository: InMemoryRestaurantStatusRepository;
let service: RestaurantStatusService;

beforeEach(() => {
  repository = new InMemoryRestaurantStatusRepository()
    .withRestaurant("rest-a")
    .withRestaurant("rest-b")
    .withRestaurant("rest-closed", "CLOSED");
  service = new RestaurantStatusService(repository);
});

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("Staff pause and reopen (UC-ORD-09)", () => {
  it("pauses their own open restaurant and records the event", async () => {
    const { restaurant, eventId } = await service.pause(staffA, "rest-a");
    expect(restaurant.status).toBe("PAUSED");
    expect(repository.events).toEqual([
      expect.objectContaining({ eventId, restaurantId: "rest-a", actorId: "staff-a", fromStatus: "OPEN", toStatus: "PAUSED" }),
    ]);
  });

  it("cannot pause another restaurant", async () => {
    await expectCode(service.pause(staffB, "rest-a"), "FORBIDDEN");
    expect(repository.restaurants.get("rest-a")?.status).toBe("OPEN");
  });

  it("reopens their own paused restaurant and records the event", async () => {
    await service.pause(staffA, "rest-a");
    const { restaurant, eventId } = await service.reopen(staffA, "rest-a");
    expect(restaurant.status).toBe("OPEN");
    expect(repository.events.at(-1)).toEqual(
      expect.objectContaining({ eventId, actorId: "staff-a", fromStatus: "PAUSED", toStatus: "OPEN" }),
    );
  });

  it("gets a conflict when the restaurant is already paused or closed", async () => {
    await service.pause(staffA, "rest-a");
    await expectCode(service.pause(staffA, "rest-a"), "CONFLICT");
    await expectCode(service.pause(operator, "rest-closed"), "CONFLICT");
    expect(repository.events).toHaveLength(1);
  });
});

describe("Operator pause and reopen (UC-ORD-12)", () => {
  it("pauses and reopens any restaurant with an event for each change", async () => {
    const paused = await service.pause(operator, "rest-b");
    const reopened = await service.reopen(operator, "rest-b");
    expect(reopened.restaurant.status).toBe("OPEN");
    expect(reopened.eventId).toBeGreaterThan(paused.eventId);
    expect(repository.events.map((e) => `${e.fromStatus}->${e.toStatus}`)).toEqual(["OPEN->PAUSED", "PAUSED->OPEN"]);
  });

  it("gets a conflict when reopening an open or closed restaurant", async () => {
    await expectCode(service.reopen(operator, "rest-a"), "CONFLICT");
    await expectCode(service.reopen(operator, "rest-closed"), "CONFLICT");
  });
});

describe("Everyone else", () => {
  it.each([
    ["null actor", null],
    ["customer", { userId: "cust-1", role: Role.CUSTOMER }],
    ["courier", { userId: "cour-1", role: Role.COURIER }],
  ])("rejects %s for pause and reopen", async (_label, actor) => {
    const a = actor as StatusActor | null;
    await expectCode(service.pause(a, "rest-a"), "FORBIDDEN");
    await expectCode(service.reopen(a, "rest-a"), "FORBIDDEN");
  });

  it("returns NOT_FOUND for an unknown restaurant", async () => {
    await expectCode(service.pause(operator, "nope"), "NOT_FOUND");
  });

  it("checks permission before revealing the restaurant's state", async () => {
    await service.pause(operator, "rest-a");
    await expectCode(service.pause(staffB, "rest-a"), "FORBIDDEN");
  });
});
