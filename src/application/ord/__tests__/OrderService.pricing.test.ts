import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "../../../domain/reg/Role.ts";
import { MAX_LINE_QUANTITY, OrderService } from "../OrderService.ts";
import type { OrderActor } from "../OrderActor.ts";
import type { PlaceOrderDTO } from "../PlaceOrderDTO.ts";
import { FakeMenuCatalog, FakePricingSettingsRepository, InMemoryOrderRepository } from "./fakes.ts";

const alice: OrderActor = { userId: "cust-alice", role: Role.CUSTOMER };

let menu: FakeMenuCatalog;
let pricing: FakePricingSettingsRepository;
let service: OrderService;

beforeEach(() => {
  menu = new FakeMenuCatalog()
    .addRestaurant("rest-a", true, "Demo Bakery")
    .addRestaurant("rest-b")
    .addRestaurant("rest-closed", false)
    .addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Macaron", unitPriceCents: 350 })
    .addItem({ menuItemId: 2, restaurantId: "rest-a", name: "Eclair", unitPriceCents: 500 })
    .addItem({ menuItemId: 3, restaurantId: "rest-a", name: "Mille-feuille", unitPriceCents: 800, available: false })
    .addItem({ menuItemId: 9, restaurantId: "rest-b", name: "Cheap tart", unitPriceCents: 1 });
  pricing = new FakePricingSettingsRepository();
  service = new OrderService(new InMemoryOrderRepository(), menu, pricing);
});

async function expectCode(code: string, input: PlaceOrderDTO) {
  await expect(service.place(alice, input)).rejects.toMatchObject({ code });
}

describe("OrderService prices orders from the menu", () => {
  it("uses the menu's name and price and computes the total server-side", async () => {
    const order = await service.place(alice, {
      restaurantId: "rest-a",
      lines: [{ menuItemId: 1, quantity: 2 }, { menuItemId: 2, quantity: 1 }],
    });
    expect(order.lines).toEqual([
      { menuItemId: 1, name: "Macaron", quantity: 2, unitPriceCents: 350 },
      { menuItemId: 2, name: "Eclair", quantity: 1, unitPriceCents: 500 },
    ]);
    expect(order.totalCents).toBe(1200);
    expect(order.fare).toEqual({
      subtotalCents: 1200,
      deliveryFeeCents: 300,
      serviceFeeCents: 150,
      smallOrderSurchargeCents: 200,
      totalCents: 1850,
    });
    expect(order.restaurantName).toBe("Demo Bakery");
  });

  it("ignores a name and price smuggled in by the client", async () => {
    const tampered = { menuItemId: 1, quantity: 1, name: "Free", unitPriceCents: 1 };
    const order = await service.place(alice, { restaurantId: "rest-a", lines: [tampered] });
    expect(order.lines[0]).toMatchObject({ name: "Macaron", unitPriceCents: 350 });
    expect(order.totalCents).toBe(350);
  });

  it("keeps the item and fare snapshots when menu prices and settings change later", async () => {
    const order = await service.place(alice, { restaurantId: "rest-a", lines: [{ menuItemId: 1, quantity: 1 }] });
    menu.addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Macaron", unitPriceCents: 999 });
    pricing.settings.deliveryFeeCents = 700;
    const restored = await service.get(alice, order.id);
    expect(restored.totalCents).toBe(350);
    expect(restored.fare).toEqual(order.fare);
  });
});

describe("OrderService rejects invalid order requests", () => {
  it("unknown restaurant", async () => {
    await expectCode("NOT_FOUND", { restaurantId: "nope", lines: [{ menuItemId: 1, quantity: 1 }] });
  });

  it("closed restaurant", async () => {
    await expectCode("CONFLICT", { restaurantId: "rest-closed", lines: [{ menuItemId: 1, quantity: 1 }] });
  });

  it("unknown menu item", async () => {
    await expectCode("NOT_FOUND", { restaurantId: "rest-a", lines: [{ menuItemId: 404, quantity: 1 }] });
  });

  it("item from another restaurant", async () => {
    await expectCode("INVALID_INPUT", { restaurantId: "rest-a", lines: [{ menuItemId: 9, quantity: 1 }] });
  });

  it("sold-out item", async () => {
    await expectCode("CONFLICT", { restaurantId: "rest-a", lines: [{ menuItemId: 3, quantity: 1 }] });
  });

  it("duplicate menu item lines", async () => {
    await expectCode("INVALID_INPUT", {
      restaurantId: "rest-a",
      lines: [{ menuItemId: 1, quantity: 1 }, { menuItemId: 1, quantity: 1 }],
    });
  });

  it("empty order", async () => {
    await expectCode("INVALID_INPUT", { restaurantId: "rest-a", lines: [] });
  });

  it.each([0, -1, 1.5, MAX_LINE_QUANTITY + 1])("quantity %s", async (quantity) => {
    await expectCode("INVALID_INPUT", { restaurantId: "rest-a", lines: [{ menuItemId: 1, quantity }] });
  });
});
