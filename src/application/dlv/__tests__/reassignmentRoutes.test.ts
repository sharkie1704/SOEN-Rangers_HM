import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import type { WaitingOrder } from "../../../domain/dlv/DispatchQueue.ts";
import { Order } from "../../../domain/ord/Order.ts";
import { OperatorRegistrar } from "../../../domain/reg/OperatorRegistrar";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../domain/reg/__tests__/fakes";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import { InMemoryMenuRepository, InMemoryOrderRepository, InMemoryRestaurantStatusRepository } from "../../ord/__tests__/fakes";
import type { RestaurantReadRepository } from "../../ord/RestaurantReadRepository";
import type { DispatchQueueRepository } from "../DispatchQueueRepository";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes";

class ReadyOrdersQueue implements DispatchQueueRepository {
  constructor(private readonly orders: InMemoryOrderRepository, private readonly assignments: InMemoryAssignmentRepository) {}

  async listWaiting(): Promise<WaitingOrder[]> {
    const waiting: WaitingOrder[] = [];
    for (const order of await this.orders.findByRestaurant("rest-a")) {
      if (order.status === "Ready" && !(await this.assignments.findActiveByOrderId(order.id))) {
        waiting.push({ orderId: order.id, restaurantId: order.restaurantId, restaurantName: "Sweet Spot", readyAt: order.placedAt });
      }
    }
    return waiting;
  }
}

let app: ReturnType<typeof createApp>;
let users: InMemoryUserRepository;
let couriers: InMemoryCourierAvailabilityRepository;
let assignments: InMemoryAssignmentRepository;
let orders: InMemoryOrderRepository;

beforeEach(async () => {
  const restaurants: RestaurantReadRepository = {
    listRestaurants: async () => [],
    findRestaurantById: async () => undefined,
    findMenuByRestaurantId: async () => [],
  };
  users = new InMemoryUserRepository();
  couriers = new InMemoryCourierAvailabilityRepository();
  assignments = new InMemoryAssignmentRepository(couriers);
  orders = new InMemoryOrderRepository();
  app = createApp({
    users,
    hasher: new FakePasswordHasher(),
    tokens: new JwtSessionTokenService("test-secret-at-least-16-chars"),
    restaurants,
    menu: new InMemoryMenuRepository(),
    restaurantStatus: new InMemoryRestaurantStatusRepository(),
    couriers,
    assignments,
    orders,
    dispatchQueue: new ReadyOrdersQueue(orders, assignments),
  });
  await orders.add(Order.restore({
    id: 7,
    restaurantId: "rest-a",
    customerId: "customer-1",
    lines: [{ menuItemId: 1, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
    placedAt: new Date("2026-11-06T12:00:00Z"),
    status: "Ready",
    events: [],
  }));
  couriers.withCourier("courier-1", "OFFLINE").withCourier("courier-2", "IDLE");
  assignments.withAssignment(7, "courier-1", "Accepted");
});

async function operatorAgent() {
  await new OperatorRegistrar(users, new FakePasswordHasher()).register({ name: "Op", email: "op@example.com", password: "password123" });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: "op@example.com", password: "password123" });
  return agent;
}

async function courierAgent() {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ role: "COURIER", name: "Casey", email: "casey@example.com", password: "password123" });
  await agent.post("/api/auth/login").send({ email: "casey@example.com", password: "password123" });
  return agent;
}

describe("Reassignment routes", () => {
  it("require a session", async () => {
    expect((await request(app).get("/api/dispatch/stalled")).status).toBe(401);
    expect((await request(app).post("/api/orders/7/reassign")).status).toBe(401);
  });

  it("list stalled orders for an operator", async () => {
    const agent = await operatorAgent();

    const res = await agent.get("/api/dispatch/stalled");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ stalled: [{ orderId: 7, restaurantId: "rest-a", courierId: "courier-1" }] });
  });

  it("reassign a stalled order to an idle courier", async () => {
    const agent = await operatorAgent();

    const res = await agent.post("/api/orders/7/reassign");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ orderId: 7, releasedCourierId: "courier-1", offeredTo: "courier-2" });
    expect((await agent.get("/api/dispatch/stalled")).body).toEqual({ stalled: [] });
  });

  it("refuse an order that is not stalled", async () => {
    couriers.withCourier("courier-1", "ASSIGNED");
    const agent = await operatorAgent();

    expect((await agent.post("/api/orders/7/reassign")).status).toBe(409);
  });

  it("report a missing assignment and a bad order ID", async () => {
    const agent = await operatorAgent();

    expect((await agent.post("/api/orders/99/reassign")).status).toBe(404);
    expect((await agent.post("/api/orders/abc/reassign")).status).toBe(400);
  });

  it("refuse a courier", async () => {
    const agent = await courierAgent();

    expect((await agent.get("/api/dispatch/stalled")).status).toBe(403);
    expect((await agent.post("/api/orders/7/reassign")).status).toBe(403);
  });
});
