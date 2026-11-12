import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { OperatorRegistrar } from "../../../domain/reg/OperatorRegistrar";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../domain/reg/__tests__/fakes";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import { InMemoryMenuRepository, InMemoryRestaurantStatusRepository } from "../../ord/__tests__/fakes";
import type { CourierOverview } from "../CourierAvailabilityRepository";
import type { RestaurantReadRepository } from "../../ord/RestaurantReadRepository";
import { InMemoryCourierAvailabilityRepository } from "./fakes";

const COURIERS = "/api/couriers";

const overviews: CourierOverview[] = [
  { id: "c-1", name: "Ava", status: "IDLE", onDuty: true, available: true, location: { lat: 45.5131, lng: -73.5683 }, activeOrderId: null },
  { id: "c-2", name: "Ben", status: "CARRYING", onDuty: true, available: false, location: { lat: 45.4973, lng: -73.5789 }, activeOrderId: 7 },
  { id: "c-3", name: "Cleo", status: "OFFLINE", onDuty: false, available: false, location: null, activeOrderId: null },
];

let app: ReturnType<typeof createApp>;
let users: InMemoryUserRepository;

beforeEach(() => {
  const restaurants: RestaurantReadRepository = {
    listRestaurants: async () => [],
    findRestaurantById: async (id) => (id === "rest-a"
      ? { id, name: "Sweet Spot", category: "Desserts", description: "", imageUrl: "", status: "OPEN", lat: 45.5131, lng: -73.5683 }
      : undefined),
    findMenuByRestaurantId: async () => [],
  };
  users = new InMemoryUserRepository();
  const couriers = new InMemoryCourierAvailabilityRepository();
  couriers.overviews = overviews;
  app = createApp({
    users,
    hasher: new FakePasswordHasher(),
    tokens: new JwtSessionTokenService("test-secret-at-least-16-chars"),
    restaurants,
    menu: new InMemoryMenuRepository(),
    restaurantStatus: new InMemoryRestaurantStatusRepository(),
    couriers,
  });
});

async function signedIn(account: Record<string, unknown>) {
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/register").send({ password: "password123", ...account })).status).toBe(201);
  await agent.post("/api/auth/login").send({ email: account.email, password: "password123" });
  return agent;
}

async function operator() {
  await new OperatorRegistrar(users, new FakePasswordHasher()).register({ name: "Op", email: "op@example.com", password: "password123" });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: "op@example.com", password: "password123" });
  return agent;
}

describe("GET /api/couriers", () => {
  it("requires a session", async () => {
    expect((await request(app).get(COURIERS)).status).toBe(401);
  });

  it("gives an operator every courier's status, availability and position", async () => {
    const res = await (await operator()).get(COURIERS);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ couriers: overviews });
  });

  it.each([
    ["customer", { role: "CUSTOMER", name: "Alice", email: "alice@example.com", address: { lat: 45.5, lng: -73.57 } }],
    ["courier", { role: "COURIER", name: "Casey", email: "casey@example.com" }],
    ["restaurant staff", { role: "RESTAURANT", name: "Sam", email: "sam@example.com", restaurantId: "rest-a" }],
  ])("is forbidden for a %s", async (_label, account) => {
    const res = await (await signedIn(account)).get(COURIERS);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });
});
