import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import type { WaitingOrder } from "../../../domain/dlv/DispatchQueue.ts";
import { OperatorRegistrar } from "../../../domain/reg/OperatorRegistrar";
import { Role } from "../../../domain/reg/Role.ts";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../domain/reg/__tests__/fakes";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import { InMemoryMenuRepository, InMemoryRestaurantStatusRepository } from "../../ord/__tests__/fakes";
import type { RestaurantReadRepository } from "../../ord/RestaurantReadRepository";
import type { DispatchQueueRepository } from "../DispatchQueueRepository";
import { DispatchQueueService } from "../DispatchQueueService";

class FakeDispatchQueue implements DispatchQueueRepository {
  waiting: WaitingOrder[] = [];
  async listWaiting() { return this.waiting; }
}

const tokens = new JwtSessionTokenService("test-secret-at-least-16-chars");
let users: InMemoryUserRepository;
let queue: FakeDispatchQueue;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  const restaurants: RestaurantReadRepository = {
    listRestaurants: async () => [],
    findRestaurantById: async () => undefined,
    findMenuByRestaurantId: async () => [],
  };
  users = new InMemoryUserRepository();
  queue = new FakeDispatchQueue();
  app = createApp({
    users,
    hasher: new FakePasswordHasher(),
    tokens,
    restaurants,
    menu: new InMemoryMenuRepository(),
    restaurantStatus: new InMemoryRestaurantStatusRepository(),
    dispatchQueue: queue,
  });
});

describe("Dispatch queue", () => {
  it("lets an operator see waiting orders, longest wait first", async () => {
    queue.waiting = [
      { orderId: 8, restaurantId: "rest-a", restaurantName: "Sweet Spot", readyAt: new Date("2026-11-06T12:05:00Z") },
      { orderId: 5, restaurantId: "rest-b", restaurantName: "Crumbs", readyAt: new Date("2026-11-06T12:00:00Z") },
    ];
    const service = new DispatchQueueService(queue);

    const result = await service.view({ userId: "op-1", role: Role.OPERATOR });

    expect(result.entries.map((entry) => entry.orderId)).toEqual([5, 8]);
  });

  it.each([Role.CUSTOMER, Role.RESTAURANT, Role.COURIER])("refuses a %s account", async (role) => {
    await expect(new DispatchQueueService(queue).view({ userId: "user-1", role })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a missing session", async () => {
    await expect(new DispatchQueueService(queue).view(null)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires a session on the route", async () => {
    expect((await request(app).get("/api/dispatch/queue")).status).toBe(401);
  });

  it("returns the queue in order to an operator", async () => {
    queue.waiting = [
      { orderId: 8, restaurantId: "rest-a", restaurantName: "Sweet Spot", readyAt: new Date("2026-11-06T12:05:00Z") },
      { orderId: 5, restaurantId: "rest-b", restaurantName: "Crumbs", readyAt: new Date("2026-11-06T12:00:00Z") },
    ];
    await new OperatorRegistrar(users, new FakePasswordHasher()).register({ name: "Op", email: "op@example.com", password: "password123" });
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "op@example.com", password: "password123" });

    const res = await agent.get("/api/dispatch/queue");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      waiting: [
        { position: 1, orderId: 5, restaurantId: "rest-b", restaurantName: "Crumbs", readyAt: "2026-11-06T12:00:00.000Z" },
        { position: 2, orderId: 8, restaurantId: "rest-a", restaurantName: "Sweet Spot", readyAt: "2026-11-06T12:05:00.000Z" },
      ],
    });
  });

  it("refuses a courier on the route", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({ role: "COURIER", name: "Casey", email: "casey@example.com", password: "password123" });
    await agent.post("/api/auth/login").send({ email: "casey@example.com", password: "password123" });

    expect((await agent.get("/api/dispatch/queue")).status).toBe(403);
  });
});
