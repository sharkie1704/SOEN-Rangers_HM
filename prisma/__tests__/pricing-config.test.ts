import { describe, expect, it } from "vitest";
import { loadPricingConfig, parsePricingConfig } from "../pricing-config.ts";

const valid = {
  deliveryFeeCents: 300,
  serviceFeeCents: 150,
  smallOrderThresholdCents: 2000,
  smallOrderSurchargeCents: 200,
};

describe("pricing configuration", () => {
  it("loads the project's configuration file", async () => {
    expect(await loadPricingConfig()).toEqual(valid);
  });

  it("accepts zero-valued fees", () => {
    const input = { ...valid, deliveryFeeCents: 0, serviceFeeCents: 0, smallOrderSurchargeCents: 0 };
    expect(parsePricingConfig(JSON.stringify(input))).toEqual(input);
  });

  it("rejects a missing required field", () => {
    const input: Record<string, number> = { ...valid };
    delete input.deliveryFeeCents;
    expect(() => parsePricingConfig(JSON.stringify(input))).toThrow("deliveryFeeCents");
  });

  it("rejects negative values", () => {
    expect(() => parsePricingConfig(JSON.stringify({ ...valid, deliveryFeeCents: -1 })))
      .toThrow("deliveryFeeCents");
  });

  it("rejects decimal-cent values", () => {
    expect(() => parsePricingConfig(JSON.stringify({ ...valid, serviceFeeCents: 1.5 })))
      .toThrow("serviceFeeCents");
  });

  it("rejects strings instead of numbers", () => {
    expect(() => parsePricingConfig(JSON.stringify({ ...valid, deliveryFeeCents: "300" })))
      .toThrow("deliveryFeeCents");
  });

  it("rejects unexpected fields", () => {
    expect(() => parsePricingConfig(JSON.stringify({ ...valid, deliveryFee: 300 }))).toThrow();
  });

  it("rejects invalid JSON", () => {
    expect(() => parsePricingConfig("{")).toThrow(SyntaxError);
  });

  it("rejects values exceeding PostgreSQL Int limits", () => {
    expect(() => parsePricingConfig(JSON.stringify({ ...valid, smallOrderThresholdCents: 2_147_483_648 })))
      .toThrow("smallOrderThresholdCents");
  });

  it("reports a missing configuration file", async () => {
    await expect(loadPricingConfig(new URL("./missing-pricing.json", import.meta.url)))
      .rejects.toMatchObject({ code: "ENOENT", message: expect.stringContaining("missing-pricing.json") });
  });
});
