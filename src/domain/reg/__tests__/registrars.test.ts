import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryUserRepository, FakePasswordHasher } from "./fakes";
import { AccountRegistrar } from "../AccountRegistrar";
import { CustomerRegistrar } from "../CustomerRegistrar";
import { StaffRegistrar } from "../StaffRegistrar";
import { CourierRegistrar } from "../CourierRegistrar";
import { OperatorRegistrar } from "../OperatorRegistrar";
import { Role } from "../Role";
import { Customer } from "../Customer";
import { Staff } from "../Staff";
import { Courier } from "../Courier";
import { Operator } from "../Operator";

const common = { name: "Robert", email: "robert@example.com", password: "password123" };
const address = { lat: 45.5, lng: -73.57 };

let repo: InMemoryUserRepository;
let hasher: FakePasswordHasher;
let customers: CustomerRegistrar;
let staff: StaffRegistrar;
let couriers: CourierRegistrar;
let operators: OperatorRegistrar;

beforeEach(() => {
  repo = new InMemoryUserRepository();
  hasher = new FakePasswordHasher();
  customers = new CustomerRegistrar(repo, hasher);
  staff = new StaffRegistrar(repo, hasher);
  couriers = new CourierRegistrar(repo, hasher);
  operators = new OperatorRegistrar(repo, hasher);
});

describe("Factory Method: each registrar creates the right role (R-REG-01)", () => {
  it("CustomerRegistrar creates a Customer with its address", async () => {
    const user = await customers.register({ ...common, address });
    expect(user).toBeInstanceOf(Customer);
    expect(user.role).toBe(Role.CUSTOMER);
    expect((user as Customer).address).toEqual(address);
  });

  it("StaffRegistrar creates a Staff linked to a restaurant", async () => {
    const user = await staff.register({ ...common, restaurantId: "r1" });
    expect(user).toBeInstanceOf(Staff);
    expect(user.role).toBe(Role.RESTAURANT);
    expect((user as Staff).restaurantId).toBe("r1");
  });

  it("CourierRegistrar creates a Courier", async () => {
    const user = await couriers.register(common);
    expect(user).toBeInstanceOf(Courier);
    expect(user.role).toBe(Role.COURIER);
  });

  it("OperatorRegistrar creates an Operator", async () => {
    const user = await operators.register(common);
    expect(user).toBeInstanceOf(Operator);
    expect(user.role).toBe(Role.OPERATOR);
  });

  it("all registrars share the AccountRegistrar flow (polymorphism)", () => {
    for (const r of [customers, staff, couriers, operators]) {
      expect(r).toBeInstanceOf(AccountRegistrar);
    }
  });
});

describe("Shared flow", () => {
  it("saves the created user in the repository", async () => {
    const user = await couriers.register(common);
    expect(repo.users).toHaveLength(1);
    expect(repo.users[0]).toBe(user);
  });

  it("stores the password hash, never the plain password", async () => {
    const user = await couriers.register(common);
    expect(user.passwordHash).toBe("hashed:password123");
    expect(user.passwordHash).not.toBe(common.password);
  });

  it("normalizes email (trim + lowercase)", async () => {
    const user = await couriers.register({ ...common, email: "  Robert@Example.COM " });
    expect(user.email).toBe("robert@example.com");
  });

  it("generates a distinct id for every account", async () => {
    const a = await couriers.register({ ...common, email: "a@example.com" });
    const b = await couriers.register({ ...common, email: "b@example.com" });
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });
});

describe("Unique email invariant", () => {
  it("rejects a duplicate email for the same role", async () => {
    await couriers.register(common);
    await expect(couriers.register(common)).rejects.toThrow(/already exists/i);
    expect(repo.users).toHaveLength(1);
  });

  it("rejects a duplicate email across different roles", async () => {
    await couriers.register(common);
    await expect(customers.register({ ...common, address })).rejects.toThrow(/already exists/i);
  });

  it("treats emails case-insensitively", async () => {
    await couriers.register(common);
    await expect(
      couriers.register({ ...common, email: "ROBERT@EXAMPLE.COM" }),
    ).rejects.toThrow(/already exists/i);
  });
});

describe("Common validation", () => {
  it.each([
    ["empty name", { ...common, name: "  " }],
    ["invalid email", { ...common, email: "not-an-email" }],
    ["short password", { ...common, password: "short" }],
  ])("rejects %s and saves nothing", async (_label, data) => {
    await expect(couriers.register(data)).rejects.toThrow();
    expect(repo.users).toHaveLength(0);
  });

  it("rejects a whitespace-only email", async () => {
    await expect(couriers.register({ ...common, email: "   " })).rejects.toThrow();
  });

  it("does not trim the password", async () => {
    const user = await couriers.register({ ...common, password: "  spaced pass  " });
    expect(user.passwordHash).toBe("hashed:  spaced pass  ");
  });
});

describe("Role-specific validation", () => {
  it("customer without an address is rejected", async () => {
    await expect(
      customers.register({ ...common, address: undefined as any }),
    ).rejects.toThrow(/address/i);
    expect(repo.users).toHaveLength(0);
  });

  it("customer with an out-of-range address is rejected", async () => {
    await expect(
      customers.register({ ...common, address: { lat: 200, lng: 0 } }),
    ).rejects.toThrow();
    expect(repo.users).toHaveLength(0);
  });

  it.each(["", "   ", undefined])("staff with restaurantId %j is rejected", async (id) => {
    await expect(
      staff.register({ ...common, restaurantId: id as any }),
    ).rejects.toThrow(/restaurant/i);
    expect(repo.users).toHaveLength(0);
  });
});