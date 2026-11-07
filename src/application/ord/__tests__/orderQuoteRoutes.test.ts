import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../app";
import { Role } from "../../../domain/reg/Role.ts";
import { Session } from "../../../domain/reg/Session.ts";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../domain/reg/__tests__/fakes";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import {
  FakeMenuCatalog, FakePricingSettingsRepository, InMemoryOrderRepository,
  InMemoryMenuRepository, InMemoryRestaurantStatusRepository,
} from "./fakes.ts";

const QUOTE = "/api/orders/quote";
const cart = { restaurantId: "rest-a", lines: [{ menuItemId: 1, quantity: 1 }] };
const tokens = new JwtSessionTokenService("test-secret-at-least-16-chars");
let app: ReturnType<typeof createApp>;
let menu: FakeMenuCatalog;
let pricing: FakePricingSettingsRepository;
let orders: InMemoryOrderRepository;

function authorization(role: Role = Role.CUSTOMER) {
  const session = new Session("user-a", role, role === Role.RESTAURANT ? "rest-a" : null,
    new Date(Date.now() + 60_000));
  return `Bearer ${tokens.issue(session)}`;
}

beforeEach(() => {
  menu = new FakeMenuCatalog().addRestaurant("rest-a")
    .addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Cake", unitPriceCents: 1000 })
    .addItem({ menuItemId: 2, restaurantId: "rest-a", name: "Sold out", unitPriceCents: 500, available: false });
  pricing = new FakePricingSettingsRepository();
  orders = new InMemoryOrderRepository();
  app = createApp({
    users: new InMemoryUserRepository(), hasher: new FakePasswordHasher(), tokens,
    restaurants: {
      listRestaurants: async () => [],
      findRestaurantById: async () => undefined,
      findMenuByRestaurantId: async () => [],
    },
    menu: new InMemoryMenuRepository(),
    restaurantStatus: new InMemoryRestaurantStatusRepository(),
    orders, orderMenu: menu, pricing,
  });
});

describe("checkout quote routes", () => {
  // Customer quotes use server prices, even if the request contains fake prices.
  it("returns authoritative lines and the complete fare for a customer", async () => {
    const response = await request(app).post(QUOTE).set("Authorization", authorization()).send({
      ...cart, subtotalCents: 1,
      lines: [{ menuItemId: 1, quantity: 1, name: "Free cake", unitPriceCents: 1 }],
    });
    expect(response.status).toBe(200);
    expect(response.body.quote).toEqual({
      lines: [{ menuItemId: 1, name: "Cake", quantity: 1, unitPriceCents: 1000 }],
      fare: { subtotalCents: 1000, deliveryFeeCents: 300, serviceFeeCents: 150,
        smallOrderSurchargeCents: 200, totalCents: 1650 },
    });
  });

  it("requires authentication", async () => {
    expect((await request(app).post(QUOTE).send(cart)).status).toBe(401);
  });

  it.each([Role.RESTAURANT, Role.COURIER, Role.OPERATOR])("rejects role %s", async (role) => {
    const response = await request(app).post(QUOTE).set("Authorization", authorization(role)).send(cart);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  // Equality must not trigger the surcharge.
  it.each([[1999, 200, 2649], [2000, 0, 2450], [2001, 0, 2451]])(
    "applies the threshold correctly for subtotal %s", async (subtotal, surcharge, total) => {
      menu.addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Cake", unitPriceCents: subtotal });
      const response = await request(app).post(QUOTE).set("Authorization", authorization()).send(cart);
      expect(response.status).toBe(200);
      expect(response.body.quote.fare).toEqual({ subtotalCents: subtotal, deliveryFeeCents: 300,
        serviceFeeCents: 150, smallOrderSurchargeCents: surcharge, totalCents: total });
    },
  );

  it.each([
    ["missing lines", {}],
    ["empty cart", { ...cart, lines: [] }],
    ["zero quantity", { ...cart, lines: [{ menuItemId: 1, quantity: 0 }] }],
    ["duplicate items", { ...cart, lines: [cart.lines[0], cart.lines[0]] }],
  ])("rejects %s", async (_label, input) => {
    const response = await request(app).post(QUOTE).set("Authorization", authorization()).send(input);
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_INPUT");
  });

  it("rejects sold-out items", async () => {
    const response = await request(app).post(QUOTE).set("Authorization", authorization())
      .send({ ...cart, lines: [{ menuItemId: 2, quantity: 1 }] });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
  });

  it("rejects closed restaurants", async () => {
    menu.addRestaurant("rest-a", false);
    const response = await request(app).post(QUOTE).set("Authorization", authorization()).send(cart);
    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
  });

  it("returns a server error when pricing settings are missing", async () => {
    vi.spyOn(pricing, "getSettings").mockRejectedValue(new Error("Pricing settings not found in database."));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await request(app).post(QUOTE).set("Authorization", authorization()).send(cart);
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal server error" });
    } finally {
      log.mockRestore();
    }
  });

  // Quoting must not change order storage or consume order/event IDs.
  it("does not save orders, allocate IDs or record events", async () => {
    const calls = [
      vi.spyOn(orders, "add"), vi.spyOn(orders, "save"),
      vi.spyOn(orders, "nextOrderId"), vi.spyOn(orders, "nextEventId"),
    ];
    const response = await request(app).post(QUOTE).set("Authorization", authorization()).send(cart);
    expect(response.status).toBe(200);
    for (const call of calls) expect(call).not.toHaveBeenCalled();
    expect(await orders.findByCustomer("user-a")).toEqual([]);
  });

  // Placement reads current menu prices and fees instead of trusting an earlier quote.
  it("recalculates pricing when the customer places the order", async () => {
    const auth = authorization();
    const quote = await request(app).post(QUOTE).set("Authorization", auth).send(cart);
    expect(quote.status).toBe(200);
    expect(quote.body.quote.fare.totalCents).toBe(1650);
    menu.addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Cake", unitPriceCents: 2500 });
    pricing.settings.deliveryFeeCents = 400;
    const response = await request(app).post("/api/orders").set("Authorization", auth)
      .send({ ...cart, fare: quote.body.quote.fare });
    expect(response.status).toBe(201);
    expect(response.body.order.totalCents).toBe(2500);
    expect(response.body.order.fare).toEqual({ subtotalCents: 2500, deliveryFeeCents: 400,
      serviceFeeCents: 150, smallOrderSurchargeCents: 0, totalCents: 3050 });
    const stored = await orders.findById(response.body.order.id);
    expect(stored?.totalCents).toBe(2500);
    expect(stored?.events).toHaveLength(1);
    expect(stored?.events[0].action).toBe("place");
  });
});
