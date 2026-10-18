import { describe, it, expect } from "vitest";
import { JwtSessionTokenService } from "../JwtSessionTokenService";
import { Session } from "../../../domain/reg/Session";
import { Role } from "../../../domain/reg/Role";

const secret = "test-secret-at-least-16-chars";
const service = new JwtSessionTokenService(secret);
const future = () => new Date(Date.now() + 60_000);

describe("JwtSessionTokenService", () => {
  it("round-trips a session", () => {
    const token = service.issue(new Session("u1", Role.RESTAURANT, "r1", future()));
    const s = service.verify(token)!;
    expect(s.userId).toBe("u1");
    expect(s.role).toBe(Role.RESTAURANT);
    expect(s.restaurantId).toBe("r1");
  });

  it("rejects a token signed with another secret", () => {
    const other = new JwtSessionTokenService("a-completely-different-secret");
    const token = other.issue(new Session("u1", Role.COURIER, null, future()));
    expect(service.verify(token)).toBeNull();
  });

  it("rejects a tampered token", () => {
    const token = service.issue(new Session("u1", Role.COURIER, null, future()));
    expect(service.verify(token.slice(0, -2) + "xx")).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = service.issue(new Session("u1", Role.COURIER, null, new Date(Date.now() - 5_000)));
    expect(service.verify(token)).toBeNull();
  });

  it("rejects garbage and refuses a weak secret", () => {
    expect(service.verify("not-a-token")).toBeNull();
    expect(() => new JwtSessionTokenService("short")).toThrow();
  });
});