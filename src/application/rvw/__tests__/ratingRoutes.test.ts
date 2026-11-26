import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { Order } from "../../../domain/ord/Order.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { Session } from "../../../domain/reg/Session.ts";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../domain/reg/__tests__/fakes";
import { Rating } from "../../../domain/rvw/Rating.ts";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import { subscribeToUserOutputEvents, type OutputEvent } from "../../http/CommandEvents.ts";
import {
  InMemoryMenuRepository, InMemoryOrderRepository, InMemoryRestaurantStatusRepository,
} from "../../ord/__tests__/fakes.ts";

const tokens = new JwtSessionTokenService("test-secret-at-least-16-chars");
const path = "/api/orders/42/rating";
const scores = { restaurantScore: 2, courierScore: 7 };
const orderInput = {
  id: 42, customerId: "customer-a", restaurantId: "restaurant-a",
  lines: [{ menuItemId: 1, name: "Cake", quantity: 1, unitPriceCents: 1000 }],
};
const stored = new Map<number, Rating>();
let orders: InMemoryOrderRepository;
let app: ReturnType<typeof createApp>;

function authorization(customerId = "customer-a", role = Role.CUSTOMER) {
  const session = new Session(customerId, role, null, new Date(Date.now() + 60_000));
  return `Bearer ${tokens.issue(session)}`;
}

beforeEach(async () => {
  stored.clear();
  orders = new InMemoryOrderRepository();
  const delivered = new Order(orderInput);
  delivered.accept("staff-a", 1);
  delivered.startPreparing("staff-a", 2);
  delivered.markReady("staff-a", 3);
  delivered.pickUp("courier-a", 4);
  delivered.deliver("courier-a", 5);
  await orders.add(delivered);
  app = createApp({
    users: new InMemoryUserRepository(), hasher: new FakePasswordHasher(), tokens,
    restaurants: {
      listRestaurants: async () => [],
      findRestaurantById: async () => undefined,
      findMenuByRestaurantId: async () => [],
    },
    menu: new InMemoryMenuRepository(),
    restaurantStatus: new InMemoryRestaurantStatusRepository(),
    orders,
    ratings: {
      scale: { min: 2, max: 7 },
      repository: {
        existsForOrder: async (id) => stored.has(id),
        findRatedOrderIds: async (customerId) => [...stored.values()]
          .filter((rating) => rating.customerId === customerId).map((rating) => rating.orderId),
        averageCourierScore: async (courierId) => {
          const courierRatings = [...stored.values()].filter((rating) => rating.courierId === courierId);
          return courierRatings.length === 0 ? null : {
            average: courierRatings.reduce((total, rating) => total + rating.courierScore, 0) / courierRatings.length,
            count: courierRatings.length,
          };
        },
        create: async (rating) => { stored.set(rating.orderId, rating); },
      },
    },
  });
});

describe("rating routes", () => {
  it("returns the correct average and count for the authenticated courier", async () => {
    stored.set(1, new Rating({
      orderId: 1, customerId: "customer-a", restaurantId: "restaurant-a", courierId: "courier-a",
      restaurantScore: 3, courierScore: 4,
    }, { min: 2, max: 7 }));
    stored.set(2, new Rating({
      orderId: 2, customerId: "customer-b", restaurantId: "restaurant-a", courierId: "courier-a",
      restaurantScore: 3, courierScore: 6,
    }, { min: 2, max: 7 }));

    const response = await request(app).get("/api/couriers/me/rating")
      .set("Authorization", authorization("courier-a", Role.COURIER));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ scale: { min: 2, max: 7 }, rating: { average: 5, count: 2 } });
  });

  it("returns no rating when the courier has not been rated", async () => {
    const response = await request(app).get("/api/couriers/me/rating")
      .set("Authorization", authorization("courier-a", Role.COURIER));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ scale: { min: 2, max: 7 }, rating: null });
  });

  it("keeps two couriers' averages and counts isolated", async () => {
    for (const [orderId, courierId, courierScore] of [
      [1, "courier-a", 4], [2, "courier-a", 6], [3, "courier-b", 2],
    ] as const) {
      stored.set(orderId, new Rating({
        orderId, customerId: `customer-${orderId}`, restaurantId: "restaurant-a", courierId,
        restaurantScore: 3, courierScore,
      }, { min: 2, max: 7 }));
    }

    const courierA = await request(app).get("/api/couriers/me/rating")
      .set("Authorization", authorization("courier-a", Role.COURIER));
    const courierB = await request(app).get("/api/couriers/me/rating")
      .set("Authorization", authorization("courier-b", Role.COURIER));
    expect(courierA.body.rating).toEqual({ average: 5, count: 2 });
    expect(courierB.body.rating).toEqual({ average: 2, count: 1 });
  });

  it.each([Role.CUSTOMER, Role.RESTAURANT, Role.OPERATOR])(
    "refuses courier average access for %s accounts", async (role) => {
      const response = await request(app).get("/api/couriers/me/rating")
        .set("Authorization", authorization("non-courier", role));
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        code: "FORBIDDEN", error: "Only couriers can view their average rating.",
      });
    },
  );

  it("saves both scores using session and order identities and returns customer-scoped state", async () => {
    const response = await request(app).post(path).set("Authorization", authorization()).send({
      ...scores, customerId: "forged", restaurantId: "forged", courierId: "forged",
    });
    expect(response.status).toBe(201);
    expect(response.body.rating).toEqual({ orderId: 42, ...scores, createdAt: expect.any(String) });
    expect(stored.get(42)).toMatchObject({
      customerId: "customer-a", restaurantId: "restaurant-a", courierId: "courier-a", ...scores,
    });
    for (const [customerId, ratedOrderIds] of [["customer-a", [42]], ["customer-b", []]] as const) {
      const state = await request(app).get("/api/ratings/me").set("Authorization", authorization(customerId));
      expect(state.status).toBe(200);
      expect(state.body).toEqual({ scale: { min: 2, max: 7 }, ratedOrderIds });
    }
  });

  it("preserves the original rating and logs both the success and duplicate refusal", async () => {
    const auth = authorization();
    const events: Omit<OutputEvent, "userId">[] = [];
    const unsubscribe = subscribeToUserOutputEvents("customer-a", false, (event) => events.push(event));
    try {
      expect((await request(app).post(path).set("Authorization", auth).send(scores)).status).toBe(201);
      const original = stored.get(42);
      const duplicate = await request(app).post(path).set("Authorization", auth)
        .send({ restaurantScore: 7, courierScore: 2 });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body).toEqual({ code: "CONFLICT", error: "This order has already been rated." });
      expect(stored.get(42)).toBe(original);
      expect(events).toEqual([201, 409].map((status) => ({
        method: "POST", path, status, timestamp: expect.any(String),
      })));
    } finally {
      unsubscribe();
    }
  });

  it.each([
    ["invalid session", (): string => "Bearer invalid", 401, "Authentication required"],
    ["wrong role", (): string => authorization("customer-a", Role.OPERATOR), 403, "Only customers can rate orders."],
    ["wrong customer", (): string => authorization("customer-b"), 403, "You can only rate your own orders."],
  ] as const)("refuses a rating with %s", async (_scenario, auth, status, message) => {
    const response = await request(app).post(path).set("Authorization", auth()).send(scores);
    expect(response.status).toBe(status);
    expect(response.body.error).toBe(message);
    expect(stored.size).toBe(0);
  });

  it.each([
    ["Placed", "Only delivered orders can be rated."],
    ["Refunded", "Only delivered orders can be rated."],
    ["Delivered", "The courier who delivered this order could not be verified."],
  ] as const)("refuses an ineligible order with status %s", async (status, message) => {
    const order = (await orders.findById(42))!;
    if (status === "Refunded") {
      order.refund("operator-a", 6);
    } else {
      await orders.add(Order.restore({ ...orderInput, placedAt: order.placedAt, status, events: [] }));
    }
    const response = await request(app).post(path).set("Authorization", authorization()).send(scores);
    expect(response.status).toBe(409);
    expect(response.body.error).toBe(message);
    expect(stored.size).toBe(0);
  });

  it("rejects a score outside the configured scale at the API boundary", async () => {
    const response = await request(app).post(path).set("Authorization", authorization())
      .send({ ...scores, restaurantScore: 1 });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: "INVALID_INPUT", error: "Restaurant score must be a whole number between 2 and 7.",
    });
    expect(stored.size).toBe(0);
  });
});
