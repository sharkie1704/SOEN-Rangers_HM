import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../app";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../domain/reg/__tests__/fakes";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import { FakeMenuCatalog, FakePricingSettingsRepository, InMemoryMenuRepository, InMemoryOrderRepository, InMemoryRestaurantStatusRepository } from "../../ord/__tests__/fakes";
import type { RestaurantReadRepository } from "../../ord/RestaurantReadRepository";
import { InMemoryDispatchRepository } from "./dispatchFakes";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes";

const RESTAURANT_ID = "sweet-spot";

let app: ReturnType<typeof createApp>;
let couriers: InMemoryCourierAvailabilityRepository;
let assignments: InMemoryAssignmentRepository;
let dispatch: InMemoryDispatchRepository;

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  const restaurant = { id: RESTAURANT_ID, name: "Sweet Spot", category: "Desserts", description: "", imageUrl: "", status: "OPEN" as const };
  const restaurants: RestaurantReadRepository = {
    listRestaurants: async () => [restaurant],
    findRestaurantById: async (id) => (id === RESTAURANT_ID ? restaurant : undefined),
    findMenuByRestaurantId: async () => [],
  };
  couriers = new InMemoryCourierAvailabilityRepository();
  assignments = new InMemoryAssignmentRepository(couriers);
  dispatch = new InMemoryDispatchRepository(couriers, assignments).withRestaurant(RESTAURANT_ID, 45.5131, -73.5683);
  app = createApp({
    users: new InMemoryUserRepository(),
    hasher: new FakePasswordHasher(),
    tokens: new JwtSessionTokenService("test-secret-at-least-16-chars"),
    restaurants,
    menu: new InMemoryMenuRepository(),
    restaurantStatus: new InMemoryRestaurantStatusRepository(),
    orders: new InMemoryOrderRepository(),
    orderMenu: new FakeMenuCatalog()
      .addRestaurant(RESTAURANT_ID)
      .addItem({ menuItemId: 1, restaurantId: RESTAURANT_ID, name: "Macaron", unitPriceCents: 350 }),
    pricing: new FakePricingSettingsRepository(),
    couriers,
    assignments,
    dispatch,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function agentFor(account: Record<string, unknown>) {
  const agent = request.agent(app);
  const registered = await agent.post("/api/auth/register").send({ password: "password123", ...account });
  expect(registered.status).toBe(201);
  await agent.post("/api/auth/login").send({ email: account.email, password: "password123" });
  return { agent, id: registered.body.user.id as string };
}

async function idleCourierAt(email: string, lat: number, lng: number) {
  const courier = await agentFor({ role: "COURIER", name: "Casey", email });
  couriers.withCourier(courier.id, "IDLE");
  dispatch.withCourierAt(courier.id, lat, lng);
  return courier;
}

// Places an order and has the restaurant accept it and mark it ready
async function readyOrder() {
  const customer = await agentFor({ role: "CUSTOMER", name: "Alice", email: `alice-${Math.random()}@example.com`, address: { lat: 45.5, lng: -73.57 } });
  const staff = await agentFor({ role: "RESTAURANT", name: "Sam", email: `sam-${Math.random()}@example.com`, restaurantId: RESTAURANT_ID });
  const placed = await customer.agent.post("/api/orders").send({ restaurantId: RESTAURANT_ID, lines: [{ menuItemId: 1, quantity: 1 }] });
  expect(placed.status).toBe(201);
  const orderId = placed.body.order.id as number;
  expect((await staff.agent.post(`/api/orders/${orderId}/accept`)).status).toBe(200);
  const ready = await staff.agent.post(`/api/orders/${orderId}/ready`);
  expect(ready.status).toBe(200);
  expect(ready.body.transition.order.status).toBe("Ready");
  return orderId;
}

describe("Dispatch through the API", () => {
  it("offers an order to the nearest idle courier as soon as the restaurant marks it ready", async () => {
    const far = await idleCourierAt("far@example.com", 45.5017, -73.5673);
    const near = await idleCourierAt("near@example.com", 45.5125, -73.5690);

    const orderId = await readyOrder();

    expect((await assignments.findActiveByOrderId(orderId))?.courierId).toBe(near.id);
    expect((await near.agent.post(`/api/orders/${orderId}/offer/accept`)).status).toBe(200);
    expect((await far.agent.post(`/api/orders/${orderId}/offer/accept`)).status).toBe(403);
  });

  it("offers a declined order to the next nearest courier", async () => {
    const far = await idleCourierAt("far@example.com", 45.5017, -73.5673);
    const near = await idleCourierAt("near@example.com", 45.5125, -73.5690);
    const orderId = await readyOrder();

    expect((await near.agent.post(`/api/orders/${orderId}/offer/decline`)).status).toBe(200);

    expect((await assignments.findActiveByOrderId(orderId))?.courierId).toBe(far.id);
    expect((await far.agent.post(`/api/orders/${orderId}/offer/accept`)).status).toBe(200);
  });

  it("keeps the order ready with no offer when no courier is free", async () => {
    await agentFor({ role: "COURIER", name: "Off", email: "off@example.com" });
    const orderId = await readyOrder();
    expect(await assignments.findActiveByOrderId(orderId)).toBeUndefined();
  });

  it("still marks the order ready when the offer fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await idleCourierAt("near@example.com", 45.5125, -73.5690);
    vi.spyOn(assignments, "saveOffer").mockRejectedValueOnce(new Error("database is down"));

    const orderId = await readyOrder();

    expect(await assignments.findActiveByOrderId(orderId)).toBeUndefined();
  });
});
