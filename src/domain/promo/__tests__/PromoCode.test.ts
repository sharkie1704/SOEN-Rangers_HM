import { describe, expect, it } from "vitest";
import { Money } from "../../prc/Money.ts";
import { PromoCode } from "../PromoCode.ts";

describe("PromoCode", () => {
  const expiry = new Date("2026-05-31T23:59:59Z");
  const promo = new PromoCode("SAVE20", 20, Money.fromCents(3000, "minOrderCents"), expiry);

  it("allows use up through expiresAt and rejects once past expiresAt", () => {
    expect(promo.isExpired(expiry)).toBe(false);
    expect(promo.discountFor(Money.fromCents(3000, "subtotalCents"), expiry).toCents()).toBe(600);

    const afterExpiry = new Date(expiry.getTime() + 1);
    expect(promo.isExpired(afterExpiry)).toBe(true);
    expect(() => promo.discountFor(Money.fromCents(3000, "subtotalCents"), afterExpiry))
      .toThrowError("Promo code SAVE20 has expired.");
  });

  it("rejects subtotals below minOrder and accepts subtotals at minOrder", () => {
    const beforeExpiry = new Date("2026-05-01T00:00:00Z");
    expect(() => promo.discountFor(Money.fromCents(2999, "subtotalCents"), beforeExpiry))
      .toThrowError("Promo code SAVE20 requires a minimum order of $30.00.");
    expect(promo.discountFor(Money.fromCents(3000, "subtotalCents"), beforeExpiry).toCents()).toBe(600);
  });

  it("reports expiration before minimum-order errors when both fail", () => {
    const afterExpiry = new Date("2026-06-01T00:00:00Z");
    expect(() => promo.discountFor(Money.fromCents(1000, "subtotalCents"), afterExpiry))
      .toThrowError("Promo code SAVE20 has expired.");
  });

  it("rejects an invalid current date instead of bypassing expiry", () => {
    expect(() => promo.isExpired(new Date("not-a-date")))
      .toThrowError("Current time must be a valid date.");
  });
});
