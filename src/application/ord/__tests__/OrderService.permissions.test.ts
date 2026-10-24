import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "../../../domain/reg/Role.ts";
import { OrderService } from "../OrderService.ts";
import type { OrderActor } from "../OrderActor.ts";
import type { OrderDTO } from "../OrderDTO.ts";
import { FakeMenuCatalog, InMemoryOrderRepository } from "./fakes.ts";

const alice: OrderActor = { userId: "cust-alice", role: Role.CUSTOMER };
const bob: OrderActor = { userId: "cust-bob", role: Role.CUSTOMER };
const staffA: OrderActor = { userId: "staff-a", role: Role.RESTAURANT, restaurantId: "rest-a" };
const staffB: OrderActor = { userId: "staff-b", role: Role.RESTAURANT, restaurantId: "rest-b" };

let service: OrderService;
let order: OrderDTO;

beforeEach(async () => {
  const menu = new FakeMenuCatalog()
    .addRestaurant("rest-a")
    .addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Macaron", unitPriceCents: 350 });
  service = new OrderService(new InMemoryOrderRepository(), menu);
  order = await service.place(alice, { restaurantId: "rest-a", lines: [{ menuItemId: 1, quantity: 2 }] });
});

async function expectForbidden(promise: Promise<unknown>) {
  await expect(promise).rejects.toMatchObject({ code: "FORBIDDEN" });
}

describe("OrderService identity", () => {
  it("stores the REG string IDs on the order", () => {
    expect(order.customerId).toBe("cust-alice");
    expect(order.restaurantId).toBe("rest-a");
  });

  it("records the acting user's string ID on state change events", async () => {
    const { event } = await service.accept(staffA, order.id);
    expect(event.actorId).toBe("staff-a");
  });

  it.each([
    ["null actor", null],
    ["blank user id", { userId: " ", role: Role.CUSTOMER }],
    ["restaurant actor without restaurant", { userId: "staff-x", role: Role.RESTAURANT, restaurantId: "" }],
    ["operator", { userId: "op-1", role: Role.OPERATOR }],
    ["courier", { userId: "cour-1", role: Role.COURIER }],
  ])("rejects %s", async (_label, actor) => {
    await expectForbidden(service.get(actor as OrderActor | null, order.id));
  });
});

describe("OrderService customer permissions", () => {
  it("only customers can place orders", async () => {
    await expectForbidden(service.place(staffA, { restaurantId: "rest-a", lines: [{ menuItemId: 1, quantity: 1 }] }));
  });

  it("customers can view and cancel only their own orders", async () => {
    expect((await service.get(alice, order.id)).id).toBe(order.id);
    await expectForbidden(service.get(bob, order.id));
    await expectForbidden(service.cancel(bob, order.id));
    expect((await service.cancel(alice, order.id)).order.status).toBe("Cancelled");
  });

  it("customers cannot perform restaurant transitions", async () => {
    await expectForbidden(service.accept(alice, order.id));
    await expectForbidden(service.reject(alice, order.id, "no"));
    await expectForbidden(service.incoming(alice, "rest-a"));
  });
});

describe("OrderService restaurant permissions", () => {
  it("staff manage orders for their own restaurant only", async () => {
    await expectForbidden(service.get(staffB, order.id));
    await expectForbidden(service.accept(staffB, order.id));
    await expectForbidden(service.incoming(staffB, "rest-a"));
    await expectForbidden(service.queue(staffB, "rest-a"));
    expect((await service.incoming(staffA, "rest-a")).map((o) => o.id)).toEqual([order.id]);
  });

  it("staff cannot cancel on behalf of a customer", async () => {
    await expectForbidden(service.cancel(staffA, order.id));
  });

  it("staff drive the order through the queue", async () => {
    await service.accept(staffA, order.id);
    expect((await service.queue(staffA, "rest-a")).map((o) => o.id)).toEqual([order.id]);
    await expectForbidden(service.markReady(staffB, order.id));
    expect((await service.markReady(staffA, order.id)).order.status).toBe("Ready");
  });
});
