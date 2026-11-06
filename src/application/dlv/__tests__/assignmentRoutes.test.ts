import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { Assignment } from "../../../domain/dlv/Assignment.ts";
import type { CourierAvailability } from "../../../domain/dlv/CourierAvailability.ts";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../domain/reg/__tests__/fakes";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import { InMemoryMenuRepository, InMemoryRestaurantStatusRepository } from "../../ord/__tests__/fakes";
import type { RestaurantReadRepository } from "../../ord/RestaurantReadRepository";
import type { AssignmentRepository, OfferAnsweredEvent } from "../AssignmentRepository";
import type { CourierStatusEvent } from "../CourierAvailabilityRepository";
import { InMemoryCourierAvailabilityRepository } from "./fakes";

class InMemoryAssignments implements AssignmentRepository {
  readonly assignments = new Map<number, Assignment>();
  #eventId = 0;

  constructor(private readonly couriers: InMemoryCourierAvailabilityRepository) {}

  async nextEventId() { return ++this.#eventId; }

  async findActiveByOrderId(orderId: number) {
    const assignment = this.assignments.get(orderId);
    return assignment?.status === "Declined" ? undefined : assignment;
  }

  async saveAccepted(_assignment: Assignment, _event: OfferAnsweredEvent, courier: CourierAvailability, courierEvent: CourierStatusEvent) {
    await this.couriers.save(courier, courierEvent);
  }

  async saveDeclined() {}
}

let app: ReturnType<typeof createApp>;
let couriers: InMemoryCourierAvailabilityRepository;
let assignments: InMemoryAssignments;

beforeEach(() => {
  const restaurants: RestaurantReadRepository = {
    listRestaurants: async () => [],
    findRestaurantById: async () => undefined,
    findMenuByRestaurantId: async () => [],
  };
  couriers = new InMemoryCourierAvailabilityRepository();
  assignments = new InMemoryAssignments(couriers);
  app = createApp({
    users: new InMemoryUserRepository(),
    hasher: new FakePasswordHasher(),
    tokens: new JwtSessionTokenService("test-secret-at-least-16-chars"),
    restaurants,
    menu: new InMemoryMenuRepository(),
    restaurantStatus: new InMemoryRestaurantStatusRepository(),
    couriers,
    assignments,
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
