import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { Assignment } from "../../../domain/dlv/Assignment.ts";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../domain/reg/__tests__/fakes";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import { Order } from "../../../domain/ord/Order.ts";
import { InMemoryMenuRepository, InMemoryOrderRepository, InMemoryRestaurantStatusRepository } from "../../ord/__tests__/fakes";
import type { RestaurantReadRepository } from "../../ord/RestaurantReadRepository";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes";

let app: ReturnType<typeof createApp>;
let couriers: InMemoryCourierAvailabilityRepository;
let assignments: InMemoryAssignmentRepository;
let orders: InMemoryOrderRepository;

beforeEach(() => {
  const restaurants: RestaurantReadRepository = {
    listRestaurants: async () => [],
    findRestaurantById: async () => undefined,
    findMenuByRestaurantId: async () => [],
  };
  couriers = new InMemoryCourierAvailabilityRepository();
  assignments = new InMemoryAssignmentRepository(couriers);
  orders = new InMemoryOrderRepository();
  app = createApp({
    users: new InMemoryUserRepository(),
    hasher: new FakePasswordHasher(),
    tokens: new JwtSessionTokenService("test-secret-at-least-16-chars"),
    restaurants,
    menu: new InMemoryMenuRepository(),
    restaurantStatus: new InMemoryRestaurantStatusRepository(),
    couriers,
    assignments,
    orders,
  });
});

async function courierAgent(email: string) {
  const agent = request.agent(app);
  const registered = await agent.post("/api/auth/register").send({ role: "COURIER", name: "Casey", email, password: "password123" });
  expect(registered.status).toBe(201);
  await agent.post("/api/auth/login").send({ email, password: "password123" });
  const id = registered.body.user.id as string;
  couriers.withCourier(id, "IDLE");
  return { agent, id };
}

describe("Offer routes", () => {
  it("require a session", async () => {
    expect((await request(app).post("/api/orders/7/offer/accept")).status).toBe(401);
    expect((await request(app).post("/api/orders/7/offer/decline")).status).toBe(401);
  });

  it("let the courier accept their offer", async () => {
    const { agent, id } = await courierAgent("casey@example.com");
    assignments.assignments.set(7, new Assignment(7, id));

    const res = await agent.post("/api/orders/7/offer/accept");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ assignment: { orderId: 7, courierId: id, status: "Accepted" }, eventId: 1 });
    expect(couriers.statuses.get(id)).toBe("ASSIGNED");
  });

  it("let the courier decline their offer", async () => {
    const { agent, id } = await courierAgent("casey@example.com");
    assignments.assignments.set(7, new Assignment(7, id));

    const res = await agent.post("/api/orders/7/offer/decline");

    expect(res.status).toBe(200);
    expect(res.body.assignment.status).toBe("Declined");
    expect(couriers.statuses.get(id)).toBe("IDLE");
  });

  it("refuse another courier's offer", async () => {
    const owner = await courierAgent("owner@example.com");
    const other = await courierAgent("other@example.com");
    assignments.assignments.set(7, new Assignment(7, owner.id));

    expect((await other.agent.post("/api/orders/7/offer/accept")).status).toBe(403);
    expect(couriers.statuses.get(owner.id)).toBe("IDLE");
  });

  it("report a missing offer and a bad order ID", async () => {
    const { agent } = await courierAgent("casey@example.com");

    expect((await agent.post("/api/orders/99/offer/accept")).status).toBe(404);
    expect((await agent.post("/api/orders/abc/offer/accept")).status).toBe(400);
  });

  it("refuse an offer answered twice", async () => {
    const { agent, id } = await courierAgent("casey@example.com");
    assignments.assignments.set(7, new Assignment(7, id));
    await agent.post("/api/orders/7/offer/accept");

    expect((await agent.post("/api/orders/7/offer/accept")).status).toBe(409);
  });
});

describe("Handoff routes", () => {
  async function readyOrderFor(courierId: string) {
    await orders.add(Order.restore({
      id: 7,
      restaurantId: "rest-a",
      restaurantName: "Dessert Shop",
      customerId: "customer-1",
      lines: [{ menuItemId: 1, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
      fare: {
        subtotalCents: 450,
        deliveryFeeCents: 300,
        serviceFeeCents: 150,
        smallOrderSurchargeCents: 200,
        totalCents: 1100,
      },
      placedAt: new Date("2026-11-05T12:00:00Z"),
      status: "Ready",
      events: [],
    }));
    assignments.withAssignment(7, courierId, "Accepted");
    couriers.withCourier(courierId, "ASSIGNED");
  }

  it("require a session", async () => {
    expect((await request(app).post("/api/orders/7/pickup")).status).toBe(401);
    expect((await request(app).post("/api/orders/7/deliver")).status).toBe(401);
  });

  it("let the assigned courier pick up then deliver", async () => {
    const { agent, id } = await courierAgent("casey@example.com");
    await readyOrderFor(id);

    const picked = await agent.post("/api/orders/7/pickup");
    expect(picked.status).toBe(200);
    expect(picked.body).toEqual({ order: { id: 7, status: "PickedUp" }, courier: { id, status: "CARRYING" } });

    const delivered = await agent.post("/api/orders/7/deliver");
    expect(delivered.status).toBe(200);
    expect(delivered.body).toEqual({ order: { id: 7, status: "Delivered" }, courier: { id, status: "IDLE" } });
  });

  it("refuse another courier", async () => {
    const owner = await courierAgent("owner@example.com");
    const other = await courierAgent("other@example.com");
    await readyOrderFor(owner.id);

    expect((await other.agent.post("/api/orders/7/pickup")).status).toBe(403);
  });

  it("refuse delivery before pickup", async () => {
    const { agent, id } = await courierAgent("casey@example.com");
    await readyOrderFor(id);

    expect((await agent.post("/api/orders/7/deliver")).status).toBe(409);
  });
});
