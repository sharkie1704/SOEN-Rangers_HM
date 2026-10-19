import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "../../../domain/reg/Role.ts";
import { MenuService } from "../MenuService.ts";
import type { OrderActor } from "../OrderActor.ts";
import { InMemoryMenuRepository } from "./fakes.ts";

const staffA: OrderActor = { userId: "staff-a", role: Role.RESTAURANT, restaurantId: "rest-a" };
const staffB: OrderActor = { userId: "staff-b", role: Role.RESTAURANT, restaurantId: "rest-b" };
const alice: OrderActor = { userId: "cust-alice", role: Role.CUSTOMER };

const brownie = { restaurantId: "rest-a", name: "Brownie", description: "", imageUrl: "", priceCents: 450, available: true };

let repository: InMemoryMenuRepository;
let service: MenuService;
let itemId: number;

beforeEach(async () => {
  repository = new InMemoryMenuRepository();
  service = new MenuService(repository);
  itemId = (await service.add(staffA, brownie)).id;
});

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("MenuService ownership (UC-ORD-08)", () => {
  it.each([
    ["null actor", null],
    ["customer", alice],
    ["staff of another restaurant", staffB],
    ["operator", { userId: "op-1", role: Role.OPERATOR }],
    ["courier", { userId: "cour-1", role: Role.COURIER }],
  ])("rejects every command from %s", async (_label, actor) => {
    const a = actor as OrderActor | null;
    await expectCode(service.list(a, "rest-a"), "FORBIDDEN");
    await expectCode(service.add(a, brownie), "FORBIDDEN");
    await expectCode(service.update(a, itemId, { priceCents: 1 }), "FORBIDDEN");
    await expectCode(service.setAvailable(a, itemId, false), "FORBIDDEN");
    await expectCode(service.remove(a, itemId), "FORBIDDEN");
  });

  it("leaves the item untouched after a refused command", async () => {
    await expectCode(service.update(staffB, itemId, { priceCents: 1 }), "FORBIDDEN");
    expect(repository.items.get(itemId)?.priceCents).toBe(450);
  });
});

describe("MenuService commands", () => {
  it("lists only the owner's items", async () => {
    await service.add(staffB, { ...brownie, restaurantId: "rest-b", name: "Tart" });
    const items = await service.list(staffA, "rest-a");
    expect(items.map((i) => i.name)).toEqual(["Brownie"]);
  });

  it("validates new items before storing them", async () => {
    await expectCode(service.add(staffA, { ...brownie, priceCents: 0 }), "INVALID_INPUT");
    expect(repository.items.size).toBe(1);
  });

  it("renames and reprices an item", async () => {
    const item = await service.update(staffA, itemId, { name: "Fudge brownie", priceCents: 500 });
    expect(item.name).toBe("Fudge brownie");
    expect(item.priceCents).toBe(500);
  });

  it("removes an item", async () => {
    await service.remove(staffA, itemId);
    expect(repository.items.has(itemId)).toBe(false);
  });

  it("returns NOT_FOUND for an unknown item", async () => {
    await expectCode(service.update(staffA, 999, { priceCents: 500 }), "NOT_FOUND");
  });
});

describe("MenuService availability events (R-ORD-05)", () => {
  it("records an event with the acting user for each real change", async () => {
    const { item, eventId } = await service.setAvailable(staffA, itemId, false);
    expect(item.available).toBe(false);
    expect(repository.events).toEqual([
      expect.objectContaining({ eventId, menuItemId: itemId, actorId: "staff-a", available: false }),
    ]);
  });

  it("gives each change a new event id", async () => {
    const first = await service.setAvailable(staffA, itemId, false);
    const second = await service.setAvailable(staffA, itemId, true);
    expect(second.eventId).toBeGreaterThan(first.eventId);
  });

  it("refuses a no-op change and records nothing", async () => {
    await expectCode(service.setAvailable(staffA, itemId, true), "CONFLICT");
    expect(repository.events).toHaveLength(0);
  });

  it("records no event for name or price edits", async () => {
    await service.update(staffA, itemId, { priceCents: 500 });
    expect(repository.events).toHaveLength(0);
  });
});
