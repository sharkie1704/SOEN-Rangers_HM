import { describe, expect, it } from "vitest";
import { calculate, type PricingConfig } from "../FareCalculator.ts";

const settings: PricingConfig = {
  deliveryFeeCents: 300,
  serviceFeeCents: 150,
  smallOrderThresholdCents: 2000,
  smallOrderSurchargeCents: 200,
};

describe("fare calculation", () => {
  // Below the threshold, all three fees are added.
  it("returns the breakdown with a small-order surcharge", () => {
    expect(calculate(1000, settings)).toEqual({
      subtotalCents: 1000,
      deliveryFeeCents: 300,
      serviceFeeCents: 150,
      smallOrderSurchargeCents: 200,
      totalCents: 1650,
    });
  });

  // A subtotal exactly at the threshold has no surcharge.
  it("does not apply the surcharge at the threshold", () => {
    expect(calculate(2000, settings)).toMatchObject({
      smallOrderSurchargeCents: 0,
      totalCents: 2450,
    });
  });

  // A subtotal above the threshold also has no surcharge.
  it("does not apply the surcharge above the threshold", () => {
    expect(calculate(2500, settings)).toMatchObject({
      smallOrderSurchargeCents: 0,
      totalCents: 2950,
    });
  });

  // Zero is a valid amount for the subtotal and all settings.
  it("accepts zero amounts", () => {
    expect(calculate(0, {
      deliveryFeeCents: 0,
      serviceFeeCents: 0,
      smallOrderThresholdCents: 0,
      smallOrderSurchargeCents: 0,
    })).toEqual({
      subtotalCents: 0,
      deliveryFeeCents: 0,
      serviceFeeCents: 0,
      smallOrderSurchargeCents: 0,
      totalCents: 0,
    });
  });

  // Negative, fractional and unsafe amounts cannot be used as a subtotal.
  it("rejects invalid subtotals", () => {
    for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => calculate(value, settings)).toThrow(
        expect.objectContaining({ code: "INVALID_INPUT" }),
      );
    }
  });

  // Every pricing field must contain a non-negative safe whole number.
  it("rejects invalid values in every pricing setting", () => {
    const fields: (keyof PricingConfig)[] = [
      "deliveryFeeCents",
      "serviceFeeCents",
      "smallOrderThresholdCents",
      "smallOrderSurchargeCents",
    ];

    for (const field of fields) {
      for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        expect(() => calculate(1000, {
          ...settings,
          [field]: value,
        })).toThrow(
          expect.objectContaining({
            code: "INVALID_INPUT",
            message: expect.stringContaining(field),
          }),
        );
      }
    }
  });

  // Valid amounts can still add up to a total that is too large.
  it("rejects addition overflow", () => {
    expect(() => calculate(Number.MAX_SAFE_INTEGER, settings)).toThrow(
      expect.objectContaining({
        code: "INVALID_INPUT",
        message: "Fare total exceeds the supported amount.",
      }),
    );
  });

  // The largest whole number JavaScript can store exactly is allowed.
  it("accepts the maximum safe integer total", () => {
    expect(calculate(Number.MAX_SAFE_INTEGER - 450, settings).totalCents)
      .toBe(Number.MAX_SAFE_INTEGER);
  });

  // The same inputs give the same result, and the settings stay unchanged.
  it("is deterministic and does not modify settings", () => {
    const input = Object.freeze({ ...settings });

    expect(calculate(1000, input)).toEqual(calculate(1000, input));
    expect(input).toEqual(settings);
  });
});
