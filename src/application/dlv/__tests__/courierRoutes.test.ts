import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../domain/reg/__tests__/fakes";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import { InMemoryMenuRepository, InMemoryRestaurantStatusRepository } from "../../ord/__tests__/fakes";
import type { RestaurantReadRepository } from "../../ord/RestaurantReadRepository";
import { InMemoryCourierAvailabilityRepository } from "./fakes";

const AVAILABILITY = "/api/couriers/me/availability";

let app: ReturnType<typeof createApp>;
let couriers: InMemoryCourierAvailabilityRepository;

beforeEach(() => {
  const restaurants: RestaurantReadRepository = {
    listRestaurants: async () => [],
    findRestaurantById: async () => undefined,
    findMenuByRestaurantId: async () => [],
  };
  couriers = new InMemoryCourierAvailabilityRepository();
  app = createApp({
    users: new InMemoryUserRepository(),
    hasher: new FakePasswordHasher(),
    tokens: new JwtSessionTokenService("test-secret-at-least-16-chars"),
    restaurants,
    menu: new InMemoryMenuRepository(),
    restaurantStatus: new InMemoryRestaurantStatusRepository(),
    couriers,
  });
});

async function agentFor(account: Record<string, unknown>) {
  const agent = request.agent(app);
  const registered = await agent.post("/api/auth/register").send({ password: "password123", ...account });
  expect(registered.status).toBe(201);
  await agent.post("/api/auth/login").send({ email: account.email, password: "password123" });
  return { agent, id: registered.body.user.id as string };
}

async function courierAgent() {
  const { agent, id } = await agentFor({ role: "COURIER", name: "Casey", email: "casey@example.com" });
  couriers.withCourier(id);
  return { agent, id };
}

describe("Courier availability routes", () => {
  it("require a session", async () => {
    expect((await request(app).get(AVAILABILITY)).status).toBe(401);
    expect((await request(app).patch(AVAILABILITY).send({ status: "IDLE" })).status).toBe(401);
  });

  it("are forbidden for other roles", async () => {
    const { agent } = await agentFor({ role: "CUSTOMER", name: "Alice", email: "alice@example.com", address: { lat: 45.5, lng: -73.57 } });
    expect((await agent.get(AVAILABILITY)).status).toBe(403);
    expect((await agent.patch(AVAILABILITY).send({ status: "IDLE" })).status).toBe(403);
  });

  it("let a courier read their status and go on and off duty", async () => {
    const { agent, id } = await courierAgent();

    const initial = await agent.get(AVAILABILITY);
    expect(initial.status).toBe(200);
    expect(initial.body.courier).toEqual({ id, status: "OFFLINE" });

    const onDuty = await agent.patch(AVAILABILITY).send({ status: "IDLE" });
    expect(onDuty.status).toBe(200);
    expect(onDuty.body.courier).toEqual({ id, status: "IDLE" });
    expect(onDuty.body.eventId).toEqual(expect.any(Number));

    const offDuty = await agent.patch(AVAILABILITY).send({ status: "OFFLINE" });
    expect(offDuty.status).toBe(200);
    expect(offDuty.body.courier).toEqual({ id, status: "OFFLINE" });
  });

  it.each(["ASSIGNED", "CARRYING", "idle", undefined])("reject %s as a requested status", async (status) => {
    const { agent, id } = await courierAgent();
    const res = await agent.patch(AVAILABILITY).send({ status });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_INPUT");
    expect(couriers.statuses.get(id)).toBe("OFFLINE");
  });

  it("refuse going offline while carrying an order", async () => {
    const { agent, id } = await courierAgent();
    couriers.withCourier(id, "CARRYING");
    const res = await agent.patch(AVAILABILITY).send({ status: "OFFLINE" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Cannot go offline while carrying an order.", code: "INVALID_TRANSITION" });
    expect(couriers.statuses.get(id)).toBe("CARRYING");
  });

  it("let an assigned courier go offline so the order can be reassigned", async () => {
    const { agent, id } = await courierAgent();
    couriers.withCourier(id, "ASSIGNED");
    expect((await agent.patch(AVAILABILITY).send({ status: "OFFLINE" })).status).toBe(200);
    expect(couriers.statuses.get(id)).toBe("OFFLINE");
  });

  it("ignore any courier ID in the request body", async () => {
    const { agent, id } = await courierAgent();
    couriers.withCourier("other-courier");
    await agent.patch(AVAILABILITY).send({ status: "IDLE", courierId: "other-courier", id: "other-courier" });
    expect(couriers.statuses.get(id)).toBe("IDLE");
    expect(couriers.statuses.get("other-courier")).toBe("OFFLINE");
  });
});
