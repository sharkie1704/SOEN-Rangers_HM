import { describe, it, expect } from "vitest";
import { Role, Customer, Staff, Courier, Operator } from "../index";

const base = {
  id: "u1",
  name: "Alice",
  email: "alice@example.com",
  passwordHash: "hashed",
};

describe("User subclasses expose exactly one fixed role (R-REG-01)", () => {
  it("Customer", () => {
    const c = new Customer({ ...base, address: { lat: 45.5, lng: -73.57 } });
    expect(c.role).toBe(Role.CUSTOMER);
  });
  it("Staff", () => {
    expect(new Staff({ ...base, restaurantId: "r1" }).role).toBe(Role.RESTAURANT);
  });
  it("Courier", () => {
    expect(new Courier(base).role).toBe(Role.COURIER);
  });
  it("Operator", () => {
    expect(new Operator(base).role).toBe(Role.OPERATOR);
  });
});

describe("Common User invariants", () => {
  it.each([
    ["id", { ...base, id: "" }],
    ["name", { ...base, name: "  " }],
    ["email", { ...base, email: "" }],
    ["passwordHash", { ...base, passwordHash: "" }],
  ])("rejects empty %s", (_field, props) => {
    expect(() => new Courier(props)).toThrow();
  });
});

describe("Customer", () => {
  const address = { lat: 45.5, lng: -73.57 };

  it("requires a valid delivery address", () => {
    expect(() => new Customer({ ...base, address: { lat: 200, lng: 0 } })).toThrow();
    expect(() => new Customer({ ...base, address: { lat: 0, lng: 181 } })).toThrow();
    expect(() => new Customer({ ...base, address: undefined as any })).toThrow();
  });

  it("allows the address to be updated, but only to a valid one", () => {
    const c = new Customer({ ...base, address });
    c.updateAddress({ lat: 46, lng: -73 });
    expect(c.address).toEqual({ lat: 46, lng: -73 });
    expect(() => c.updateAddress({ lat: 999, lng: 0 })).toThrow();
    expect(c.address).toEqual({ lat: 46, lng: -73 }); // unchanged after failed update
  });
});

describe("Staff", () => {
  it("requires a restaurantId", () => {
    expect(() => new Staff({ ...base, restaurantId: "" })).toThrow();
    expect(() => new Staff({ ...base, restaurantId: "   " })).toThrow();
  });
  it("keeps the restaurantId", () => {
    expect(new Staff({ ...base, restaurantId: "r1" }).restaurantId).toBe("r1");
  });
});

describe("Read-only attributes", () => {
  it("role cannot be reassigned", () => {
    const c = new Courier(base);
    expect(() => {
      // @ts-expect-error role has no setter
      c.role = Role.OPERATOR;
    }).toThrow(TypeError);
    expect(c.role).toBe(Role.COURIER);
  });
});
