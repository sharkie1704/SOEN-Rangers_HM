import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "../../../domain/reg/Role.ts";
import { MAX_LINE_QUANTITY, OrderService } from "../OrderService.ts";
import type { OrderActor } from "../OrderActor.ts";
import type { PlaceOrderDTO } from "../PlaceOrderDTO.ts";
import { FakeMenuCatalog, InMemoryOrderRepository } from "./fakes.ts";

const alice: OrderActor = { userId: "cust-alice", role: Role.CUSTOMER };

let menu: FakeMenuCatalog;
let service: OrderService;

beforeEach(() => {
  menu = new FakeMenuCatalog()
    .addRestaurant("rest-a")
    .addRestaurant("rest-b")
    .addRestaurant("rest-closed", false)
    .addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Macaron", unitPriceCents: 350 })
    .addItem({ menuItemId: 2, restaurantId: "rest-a", name: "Eclair", unitPriceCents: 500 })
    .addItem({ menuItemId: 3, restaurantId: "rest-a", name: "Mille-feuille", unitPriceCents: 800, available: false })
    .addItem({ menuItemId: 9, restaurantId: "rest-b", name: "Cheap tart", unitPriceCents: 1 });
  service = new OrderService(new InMemoryOrderRepository(), menu);
});

function expectCode(code: string, input: PlaceOrderDTO) {
  expect(() => service.place(alice, input)).toThrow(expect.objectContaining({ code }));
}

describe("OrderService prices orders from the menu", () => {
  it("uses the menu's name and price and computes the total server-side", () => {
    const order = service.place(alice, {
      restaurantId: "rest-a",
      lines: [{ menuItemId: 1, quantity: 2 }, { menuItemId: 2, quantity: 1 }],
    });
    expect(order.lines).toEqual([
      { menuItemId: 1, name: "Macaron", quantity: 2, unitPriceCents: 350 },
      { menuItemId: 2, name: "Eclair", quantity: 1, unitPriceCents: 500 },
    ]);
    expect(order.totalCents).toBe(1200);
  });

  it("ignores a name and price smuggled in by the client", () => {
    const tampered = { menuItemId: 1, quantity: 1, name: "Free", unitPriceCents: 1 };
    const order = service.place(alice, { restaurantId: "rest-a", lines: [tampered] });
    expect(order.lines[0]).toMatchObject({ name: "Macaron", unitPriceCents: 350 });
    expect(order.totalCents).toBe(350);
  });

  it("keeps the price snapshot when the menu changes later", () => {
    const order = service.place(alice, { restaurantId: "rest-a", lines: [{ menuItemId: 1, quantity: 1 }] });
    menu.addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Macaron", unitPriceCents: 999 });
    expect(service.get(alice, order.id).totalCents).toBe(350);
  });
});

describe("OrderService rejects invalid order requests", () => {
  it("unknown restaurant", () => {
    expectCode("NOT_FOUND", { restaurantId: "nope", lines: [{ menuItemId: 1, quantity: 1 }] });
  });

  it("closed restaurant", () => {
    expectCode("CONFLICT", { restaurantId: "rest-closed", lines: [{ menuItemId: 1, quantity: 1 }] });
  });

  it("unknown menu item", () => {
    expectCode("NOT_FOUND", { restaurantId: "rest-a", lines: [{ menuItemId: 404, quantity: 1 }] });
  });

  it("item from another restaurant", () => {
    expectCode("INVALID_INPUT", { restaurantId: "rest-a", lines: [{ menuItemId: 9, quantity: 1 }] });
  });

  it("sold-out item", () => {
    expectCode("CONFLICT", { restaurantId: "rest-a", lines: [{ menuItemId: 3, quantity: 1 }] });
  });

  it("duplicate menu item lines", () => {
    expectCode("INVALID_INPUT", {
      restaurantId: "rest-a",
      lines: [{ menuItemId: 1, quantity: 1 }, { menuItemId: 1, quantity: 1 }],
    });
  });

  it("empty order", () => {
    expectCode("INVALID_INPUT", { restaurantId: "rest-a", lines: [] });
  });

  it.each([0, -1, 1.5, MAX_LINE_QUANTITY + 1])("quantity %s", (quantity) => {
    expectCode("INVALID_INPUT", { restaurantId: "rest-a", lines: [{ menuItemId: 1, quantity }] });
  });
});
