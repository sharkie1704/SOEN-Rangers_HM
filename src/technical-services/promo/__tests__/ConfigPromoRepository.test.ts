import { describe, expect, it } from "vitest";
import { Money } from "../../../domain/prc/Money.ts";
import { ConfigPromoRepository, endOfDay } from "../ConfigPromoRepository.ts";

const subtotal = Money.fromCents(3000, "subtotalCents");

function repository(expiresOn: string) {
  return new ConfigPromoRepository([{ code: "save20", type: "percent", value: 20, expiresOn, minOrderValue: 0 }]);
}

describe("endOfDay", () => {
  it("ends the expiry date at 23:59:59.999 Montreal time in winter", () => {
    expect(endOfDay("2027-12-31").toISOString()).toBe("2028-01-01T04:59:59.999Z");
  });

  it("ends the expiry date at 23:59:59.999 Montreal time in summer", () => {
    expect(endOfDay("2026-05-31").toISOString()).toBe("2026-06-01T03:59:59.999Z");
  });
});

describe("ConfigPromoRepository", () => {
  it("keeps a code valid in the evening of its expiry date", async () => {
    const promo = await repository("2027-12-31").findByCode("SAVE20");

    expect(() => promo?.validateFor(subtotal, new Date("2027-12-31T23:30:00-05:00"))).not.toThrow();
  });

  it("expires a code the day after its expiry date", async () => {
    const promo = await repository("2027-12-31").findByCode("SAVE20");

    expect(() => promo?.validateFor(subtotal, new Date("2028-01-01T00:00:00-05:00"))).toThrow("Promo code SAVE20 has expired.");
  });

  it("finds codes regardless of case", async () => {
    const promo = await repository("2027-12-31").findByCode(" save20 ");

    expect(promo?.discountFor(subtotal).toCents()).toBe(600);
  });
});
