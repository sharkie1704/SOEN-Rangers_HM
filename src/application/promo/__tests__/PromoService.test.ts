import { afterEach, describe, expect, it, vi } from "vitest";
import { PromoService } from "../PromoService.ts";

const fare = {
  subtotalCents: 900,
  deliveryFeeCents: 300,
  serviceFeeCents: 150,
  smallOrderSurchargeCents: 200,
  totalCents: 1550,
};

const service = new PromoService({ findByCode: async () => null });

afterEach(() => vi.restoreAllMocks());

describe("PromoService refusals are logged", () => {
  it.each([[""], ["   "], [42], [undefined]])("logs a missing promo code (%j)", async (code) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(service.apply(fare, code)).rejects.toThrow("Enter a promo code.");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[PROMO] refused"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("reason=missing"));
  });

  it("logs an unknown promo code", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(service.apply(fare, "bogus")).rejects.toThrow("Promo code BOGUS does not exist.");
    expect(warn).toHaveBeenCalledWith("[PROMO] refused code=BOGUS reason=unknown");
  });
});
