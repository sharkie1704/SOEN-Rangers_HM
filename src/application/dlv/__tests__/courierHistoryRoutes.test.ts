import request from "supertest";
import { expect, it, vi } from "vitest";
import { createApp } from "../../../app";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../domain/reg/__tests__/fakes";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import { InMemoryMenuRepository, InMemoryRestaurantStatusRepository } from "../../ord/__tests__/fakes";

it("authenticates history requests and ignores a supplied foreign courier ID", async () => {
  const findCompleted = vi.fn(async (courierId: string) => [{
    orderId: courierId === "foreign" ? 99 : 11, restaurantId: "bakery", restaurantName: "Bakery",
    lines: [{ name: "Brownie", quantity: 1 }], placedAt: new Date(0), deliveredAt: null, generatedAt: null,
  }]);
  const app = createApp({
    users: new InMemoryUserRepository(), hasher: new FakePasswordHasher(),
    tokens: new JwtSessionTokenService("test-secret-at-least-16-chars"),
    restaurants: { listRestaurants: async () => [], findRestaurantById: async () => undefined, findMenuByRestaurantId: async () => [] },
    menu: new InMemoryMenuRepository(), restaurantStatus: new InMemoryRestaurantStatusRepository(),
    courierHistory: { findCompleted },
  });
  expect((await request(app).get("/api/couriers/me/history")).status).toBe(401);
  const agent = request.agent(app);
  const registered = await agent.post("/api/auth/register").send({
    role: "COURIER", name: "Casey", email: "history@example.com", password: "password123",
  });
  expect(registered.status).toBe(201);
  await agent.post("/api/auth/login").send({ email: "history@example.com", password: "password123" });
  const response = await agent.get("/api/couriers/me/history?courierId=foreign");
  expect(response.status).toBe(200);
  expect(response.body.summaries).toMatchObject([{ orderId: 11, generatedAt: null }]);
  expect(findCompleted).toHaveBeenCalledExactlyOnceWith(registered.body.user.id);
});
