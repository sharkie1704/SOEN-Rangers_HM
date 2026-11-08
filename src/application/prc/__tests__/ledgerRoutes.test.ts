import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { OperatorRegistrar } from "../../../domain/reg/OperatorRegistrar";
import type { LedgerEntry } from "../../../domain/prc/LedgerEntry.ts";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../domain/reg/__tests__/fakes";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import { createApp } from "../../../app";
import { InMemoryMenuRepository, InMemoryRestaurantStatusRepository } from "../../ord/__tests__/fakes";
import type { RestaurantReadRepository } from "../../ord/RestaurantReadRepository";
import type { LedgerRepository, LedgerSnapshot } from "../LedgerRepository";

class InMemoryLedgerRepository implements LedgerRepository {
  epoch = 0;
  entries: LedgerEntry[] = [];

  async read(): Promise<LedgerSnapshot> {
    return { currentEpoch: this.epoch, entries: [...this.entries] };
  }

  async startNewEpoch(): Promise<number> {
    this.epoch += 1;
    return this.epoch;
  }
}

const restaurants: RestaurantReadRepository = {
  listRestaurants: async () => [],
  findRestaurantById: async () => undefined,
  findMenuByRestaurantId: async () => [],
};

let app: ReturnType<typeof createApp>;
let users: InMemoryUserRepository;
let hasher: FakePasswordHasher;
let ledger: InMemoryLedgerRepository;

beforeEach(() => {
  users = new InMemoryUserRepository();
  hasher = new FakePasswordHasher();
  ledger = new InMemoryLedgerRepository();
  app = createApp({
    users,
    hasher,
    tokens: new JwtSessionTokenService("test-secret-at-least-16-chars"),
    restaurants,
    menu: new InMemoryMenuRepository(),
    restaurantStatus: new InMemoryRestaurantStatusRepository(),
    ledger,
  });
});

async function login(email: string) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({ email, password: "password123" });
  expect(response.status).toBe(200);
  return agent;
}

describe("billing ledger routes", () => {
  it("requires authentication and denies customers access to the full ledger and reset", async () => {
    expect((await request(app).get("/api/ledger")).status).toBe(401);

    await request(app).post("/api/auth/register").send({
      role: "CUSTOMER",
      name: "Customer",
      email: "customer@example.com",
      password: "password123",
      address: { lat: 45.5, lng: -73.57 },
    });
    const customer = await login("customer@example.com");

    expect((await customer.get("/api/ledger")).status).toBe(403);
    expect((await customer.post("/api/ledger/reset")).status).toBe(403);
  });

  it("lets an operator read all epochs and reset only the visible epoch", async () => {
    ledger.entries.push({
      eventId: 7,
      orderId: 3,
      finalState: "Rejected",
      epoch: 0,
      placedAt: new Date("2026-11-07T10:00:00Z"),
      finalizedAt: new Date("2026-11-07T10:05:00Z"),
      deliveredAt: null,
      totalChargeCents: 0,
    });
    await new OperatorRegistrar(users, hasher).register({
      name: "Operator",
      email: "operator@example.com",
      password: "password123",
    });
    const operator = await login("operator@example.com");

    expect((await operator.get("/api/ledger")).body).toMatchObject({
      currentEpoch: 0,
      entries: [{ eventId: 7, orderId: 3, epoch: 0, totalChargeCents: 0 }],
    });
    const reset = await operator.post("/api/ledger/reset");
    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({ epoch: 1 });
    expect((await operator.get("/api/ledger")).body).toMatchObject({
      currentEpoch: 1,
      entries: [{ eventId: 7, orderId: 3, epoch: 0 }],
    });
    expect(ledger.epoch).toBe(1);
  });
});
