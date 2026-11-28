import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import {
  InMemoryUserRepository,
  FakePasswordHasher,
} from "../../../domain/reg/__tests__/fakes";
import type { RestaurantReadRepository } from "../RestaurantReadRepository";
import { InMemoryMenuRepository, InMemoryRestaurantStatusRepository } from "./fakes";

// Sample data used by our tests 
const restaurant = {
  id: "restaurant-1",
  name: "Sweet Dreams",
  category: "Bakery",
  description: "Fresh cakes and desserts",
  imageUrl: "https://example.com/cake.jpg",
  lat: 45.5,
  lng: -73.57,
  status: "OPEN" as const,
};

const menuItem = {
  id: 1,
  restaurantId: restaurant.id,
  name: "Chocolate Brownie",
  description: "Rich chocolate brownie",
  imageUrl: "https://example.com/brownie.jpg",
  priceCents: 675,
  available: true,
};

let app: ReturnType<typeof createApp>;
let restaurants: RestaurantReadRepository;

//BEOFORE EACH TEST, SET UP A  FAKE REPOSITORY
beforeEach(() => {
  // Fake repository 
  restaurants = {
    listRestaurants: async () => [restaurant],
    findRestaurantById: async (id) =>
      id === restaurant.id ? restaurant : undefined,
    findMenuByRestaurantId: async (id) =>
      id === restaurant.id ? [menuItem] : [],
  };

  app = createApp({
    users: new InMemoryUserRepository(),
    hasher: new FakePasswordHasher(),
    tokens: new JwtSessionTokenService("test-secret-at-least-16-chars"),
    restaurants,
    menu: new InMemoryMenuRepository(),
    restaurantStatus: new InMemoryRestaurantStatusRepository(),
  });
});

// Register and log in a customer so they can access protected endpoints
async function loggedInAgent() {
  const agent = request.agent(app);

  await agent.post("/api/auth/register").send({
    role: "CUSTOMER",
    name: "Alice",
    email: "alice@example.com",
    password: "password123",
    address: { lat: 45.5, lng: -73.57 },
  });

  await agent.post("/api/auth/login").send({
    email: "alice@example.com",
    password: "password123",
  });

  return agent;
}

describe("Restaurant browsing routes", () => {

      // TEST 1: AUTHENTICATION
  // Verify that a user who is not logged in cannot access
  it("rejects unauthenticated requests", async () => {
    const endpoints = [
      "/api/public/restaurants",
      "/api/restaurants",
      "/api/restaurants/restaurant-1",
      "/api/restaurants/restaurant-1/rating-summary",
      "/api/restaurants/restaurant-1/menu",
    ];

    for (const endpoint of endpoints) {
      const response = await request(app).get(endpoint);
      expect(response.status).toBe(401);
    }
  });
  it("returns 404 for the retired public restaurant list even with a session", async () => {
    const agent = await loggedInAgent();
    const response = await agent.get("/api/public/restaurants");

    expect(response.status).toBe(404);
  });

   // TEST 2: RESTAURANT LIST
  // Verify that GET /api/restaurants returns the restaurants

  it("returns the list of restaurants", async () => {
    const agent = await loggedInAgent();

    const response = await agent.get("/api/restaurants");

    expect(response.status).toBe(200);
    expect(response.body.restaurants).toEqual([restaurant]);
  });

   // TEST 3: RESTAURANT DETAILS
  // Verify that we can retrieve one restaurant using its ID.
  it("returns one restaurant by ID", async () => {
    const agent = await loggedInAgent();

    const response = await agent.get("/api/restaurants/restaurant-1");

    expect(response.status).toBe(200);

    // The response should contain our sample restaurant.
    expect(response.body.restaurant).toEqual(restaurant);
  });

  it("returns the average rating and count from the restaurant detail read", async () => {
    restaurants.findRestaurantById = async (id) => id === restaurant.id
      ? { ...restaurant, averageRating: 4.25, ratingCount: 4 }
      : undefined;
    const agent = await loggedInAgent();
    const response = await agent.get("/api/restaurants/restaurant-1/rating-summary");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ rating: { average: 4.25, count: 4 } });
  });

  it("returns an explicit empty rating summary and a clear error for unknown restaurants", async () => {
    const agent = await loggedInAgent();
    const empty = await agent.get("/api/restaurants/restaurant-1/rating-summary");
    const unknown = await agent.get("/api/restaurants/unknown/rating-summary");

    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ rating: { average: null, count: 0 } });
    expect(unknown.status).toBe(404);
    expect(unknown.body).toEqual({ error: "Restaurant not found" });
  });
 
  // TEST 4: RESTAURANT MENU
  // Verify that the menu endpoint returns the desserts
  // belonging to the selected restaurant.
  it("returns the restaurant menu", async () => {
    const agent = await loggedInAgent();

    const response = await agent.get("/api/restaurants/restaurant-1/menu");

    expect(response.status).toBe(200);
    expect(response.body.menuItems).toEqual([menuItem]);
  });

    // TEST 5: RESTAURANT NOT FOUND
  // Request a restaurant ID that does not exist.
  it("returns 404 when the restaurant does not exist", async () => {
    const agent = await loggedInAgent();

    const response = await agent.get("/api/restaurants/unknown");

    expect(response.status).toBe(404);
  });

   // TEST 6: MENU FOR A NONEXISTENT RESTAURANT
  // Verify that requesting a menu for an unknown restaurant
  it("returns 404 when requesting a nonexistent restaurant's menu", async () => {
    const agent = await loggedInAgent();

    const response = await agent.get("/api/restaurants/unknown/menu");

    expect(response.status).toBe(404);
  });

  

  // TEST 7: EXISTING RESTAURANT WITH AN EMPTY MENU
  // The restaurant exists, but its menu contains no desserts

  it("returns an empty menu for an existing restaurant with no items", async () => {
    const agent = await loggedInAgent();

    restaurants.findMenuByRestaurantId = async () => [];

    const response = await agent.get("/api/restaurants/restaurant-1/menu");

    expect(response.status).toBe(200);
    expect(response.body.menuItems).toEqual([]);
  });


 // TEST 8: INTERNAL SERVER ERROR
  // Simulate a database failure by making the fake repository
  it("returns 500 when the repository fails", async () => {
    const agent = await loggedInAgent();

    restaurants.listRestaurants = async () => {
      throw new Error("Database connection failed");
    };

    const response = await agent.get("/api/restaurants");

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain(
      "Database connection failed"
    );
  });
});
