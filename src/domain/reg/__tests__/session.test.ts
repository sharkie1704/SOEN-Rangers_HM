import { describe, it, expect } from "vitest";
import { Session } from "../Session";
import { Role, Staff, Courier } from "../index";

const base = { id: "u1", name: "A", email: "a@example.com", passwordHash: "h" };

describe("Session", () => {
  it("expires after its ttl", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const s = Session.forUser(new Courier(base), 1000, now);
    expect(s.isExpired(new Date(now.getTime() + 999))).toBe(false);
    expect(s.isExpired(new Date(now.getTime() + 1000))).toBe(true);
  });

  it("carries restaurantId only for staff", () => {
    const staff = Session.forUser(new Staff({ ...base, restaurantId: "r1" }), 1000);
    expect(staff.toAuthenticatedUser()).toEqual({ id: "u1", role: Role.RESTAURANT, restaurantId: "r1" });

    const courier = Session.forUser(new Courier(base), 1000);
    expect(courier.toAuthenticatedUser()).toEqual({ id: "u1", role: Role.COURIER });
  });
});