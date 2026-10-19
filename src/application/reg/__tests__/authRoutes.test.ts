import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../../app";
import { JwtSessionTokenService } from "../../../technical-services/reg/JwtSessionTokenService";
import { OperatorRegistrar } from "../../../domain/reg/OperatorRegistrar";
import { InMemoryUserRepository, FakePasswordHasher } from "../../../domain/reg/__tests__/fakes";
import type { RestaurantReadRepository,} from "../../ord/RestaurantReadRepository";

const customer = {
  role: "CUSTOMER",
  name: "Alice",
  email: "alice@example.com",
  password: "password123",
  address: { lat: 45.5, lng: -73.57 },
};

let users: InMemoryUserRepository;
let hasher: FakePasswordHasher;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  users = new InMemoryUserRepository();
  hasher = new FakePasswordHasher();
  app = createApp({ users, hasher, tokens: new JwtSessionTokenService("test-secret-at-least-16-chars"),
     restaurants: fakeRestaurants,
   });
});
const fakeRestaurants: RestaurantReadRepository = {
  listRestaurants: async () => [],
  findRestaurantById: async () => undefined,
  findMenuByRestaurantId: async () => [],
};

describe("POST /api/auth/register", () => {
  it("creates a customer and never returns the password hash", async () => {
    const res = await request(app).post("/api/auth/register").send(customer);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "alice@example.com", role: "CUSTOMER" });
    expect(JSON.stringify(res.body)).not.toContain("hashed:");
  });

  it("refuses public operator signup", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ role: "OPERATOR", name: "Eve", email: "eve@example.com", password: "password123" });
    expect(res.status).toBe(403);
    expect(users.users).toHaveLength(0);
  });

  it("returns 409 for a duplicate email", async () => {
    await request(app).post("/api/auth/register").send(customer);
    const res = await request(app).post("/api/auth/register").send(customer);
    expect(res.status).toBe(409);
  });

  it("returns 400 when a customer has no address", async () => {
    const { address: _a, ...noAddress } = customer;
    const res = await request(app).post("/api/auth/register").send(noAddress);
    expect(res.status).toBe(400);
  });

  it("returns 400 for a weak password or unknown role", async () => {
    expect((await request(app).post("/api/auth/register").send({ ...customer, password: "short" })).status).toBe(400);
    expect((await request(app).post("/api/auth/register").send({ ...customer, role: "ADMIN" })).status).toBe(400);
  });
});

describe("login / session / logout", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(customer);
  });

  it("logs in and sets an httpOnly session cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ALICE@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("CUSTOMER");
    const cookie = (res.headers["set-cookie"] as unknown as string[]).join(";");
    expect(cookie).toContain("session=");
    expect(cookie).toContain("HttpOnly");
  });

  it("gives the same 401 for a wrong password and an unknown email", async () => {
    const wrong = await request(app).post("/api/auth/login").send({ email: customer.email, password: "nope-nope-nope" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "who@example.com", password: "password123" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("blocks guests from any other /api route (R-REG-02)", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/anything-else")).status).toBe(401);
  });

  it("serves /me with a session and loses access after logout", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: customer.email, password: "password123" });

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe("CUSTOMER");

    await agent.post("/api/auth/logout");
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });
});

describe("POST /api/operator/accounts", () => {
  it("is forbidden for a customer", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(customer);
    await agent.post("/api/auth/login").send({ email: customer.email, password: "password123" });
    const res = await agent
      .post("/api/operator/accounts")
      .send({ name: "New", email: "new@example.com", password: "password123" });
    expect(res.status).toBe(403);
  });

  it("lets an operator create another operator", async () => {
    await new OperatorRegistrar(users, hasher).register({
      name: "Op", email: "op@example.com", password: "password123",
    });
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "op@example.com", password: "password123" });
    const res = await agent
      .post("/api/operator/accounts")
      .send({ name: "Op2", email: "op2@example.com", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("OPERATOR");
  });
});