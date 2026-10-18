import { describe, it, expect, vi } from "vitest";
import { AuthenticateController } from "../AuthenticateController";
import { Session } from "../../../domain/reg/Session";
import { Role } from "../../../domain/reg/Role";
import { SessionTokenService } from "../../../domain/reg/ports/SessionTokenService";

const valid = new Session("u1", Role.CUSTOMER, null, new Date(Date.now() + 60_000));
const tokens: SessionTokenService = {
  issue: () => "good",
  verify: (t) => (t === "good" ? valid : null),
};

function run(req: any) {
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  new AuthenticateController(tokens).handle(req, res, next);
  return { res, next };
}

describe("authenticate middleware (R-REG-02: no guest access)", () => {
  it("401 when no token is sent", () => {
    const { res, next } = run({ cookies: {}, headers: {} });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 when the token is invalid", () => {
    const { res, next } = run({ cookies: { session: "bad" }, headers: {} });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a valid cookie and attaches req.user", () => {
    const req: any = { cookies: { session: "good" }, headers: {} };
    const { next } = run(req);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: "u1", role: Role.CUSTOMER });
  });

  it("accepts a Bearer header", () => {
    const req: any = { cookies: {}, headers: { authorization: "Bearer good" } };
    const { next } = run(req);
    expect(next).toHaveBeenCalled();
    expect(req.user?.id).toBe("u1");
  });
});