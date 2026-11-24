import { describe, expect, it } from "vitest";
import { OrderError } from "../../ord/OrderError.ts";
import { calculate, type PricingConfig } from "../FareCalculator.ts";

// Characterization tests: they record what FareCalculator does today,
// so the same behaviour can be checked again after refactoring.

const settings: PricingConfig = {
  deliveryFeeCents: 300,
  serviceFeeCents: 150,
  smallOrderThresholdCents: 2000,
  smallOrderSurchargeCents: 200,
};

const MAX = Number.MAX_SAFE_INTEGER;
const FIELDS: readonly (keyof PricingConfig)[] = [
  "deliveryFeeCents",
  "serviceFeeCents",
  "smallOrderThresholdCents",
  "smallOrderSurchargeCents",
];
const INVALID_AMOUNTS: readonly unknown[] = [
  -1, -0.5, 1.5, NaN, Infinity, -Infinity, MAX + 1, -MAX - 1,
  "1000", null, undefined, true, {}, [],
];
const OVERFLOW_MESSAGE = "Fare total exceeds the supported amount.";
const SETTINGS_REQUIRED_MESSAGE = "Pricing settings are required.";
const invalidFieldMessage = (field: string) =>
  `${field} must be a non-negative safe integer in cents.`;

// Runs the call and returns what it threw; fails the test if nothing was thrown.
function thrownBy(run: () => unknown): OrderError {
  try {
    run();
  } catch (error) {
    return error as OrderError;
  }
  throw new Error("Expected calculate to throw, but it returned normally.");
}

// Checks the error type, code and exact message together.
function expectOrderError(run: () => unknown, message: string): void {
  const error = thrownBy(run);
  expect(error).toBeInstanceOf(OrderError);
  expect(error.code).toBe("INVALID_INPUT");
  expect(error.message).toBe(message);
}

const asConfig = (value: unknown) => value as PricingConfig;

describe("FareCalculator characterization", () => {
  describe("calculations", () => {
    // [subtotal, expected surcharge, expected total] with the default settings.
    it.each([
      [0, 200, 650],
      [1, 200, 651],
      [1000, 200, 1650],
      [1999, 200, 2649],
      [2000, 0, 2450],
      [2001, 0, 2451],
      [2500, 0, 2950],
      [1_000_000, 0, 1_000_450],
    ])("subtotal %i gives surcharge %i and total %i", (subtotal, surcharge, total) => {
      expect(calculate(subtotal, settings)).toEqual({
        subtotalCents: subtotal,
        deliveryFeeCents: 300,
        serviceFeeCents: 150,
        smallOrderSurchargeCents: surcharge,
        totalCents: total,
      });
    });

    // The total is always the sum of the four parts.
    it("total equals subtotal + delivery + service + surcharge", () => {
      for (const subtotal of [0, 1, 1999, 2000, 2001, 123_456]) {
        const r = calculate(subtotal, settings);
        expect(r.totalCents).toBe(
          r.subtotalCents + r.deliveryFeeCents + r.serviceFeeCents + r.smallOrderSurchargeCents,
        );
      }
    });

    // With a threshold of 0, no subtotal is below it, so there is never a surcharge.
    it("never applies the surcharge when the threshold is 0", () => {
      const pricing = { ...settings, smallOrderThresholdCents: 0 };
      expect(calculate(0, pricing)).toMatchObject({ smallOrderSurchargeCents: 0, totalCents: 450 });
    });

    // A surcharge of 0 below the threshold gives a surcharge of 0.
    it("adds nothing when the configured surcharge is 0", () => {
      const pricing = { ...settings, smallOrderSurchargeCents: 0 };
      expect(calculate(1000, pricing)).toMatchObject({ smallOrderSurchargeCents: 0, totalCents: 1450 });
    });

    // Delivery and service fees are copied unchanged into the result.
    it("copies the delivery and service fees into the result", () => {
      const pricing = { ...settings, deliveryFeeCents: 999, serviceFeeCents: 1 };
      expect(calculate(5000, pricing)).toMatchObject({
        deliveryFeeCents: 999,
        serviceFeeCents: 1,
        totalCents: 6000,
      });
    });

    // The largest value Prisma can store (32-bit int) works in every setting.
    it("accepts the largest database values in every setting", () => {
      const big = 2_147_483_647;
      expect(calculate(0, {
        deliveryFeeCents: big,
        serviceFeeCents: big,
        smallOrderThresholdCents: big,
        smallOrderSurchargeCents: big,
      })).toEqual({
        subtotalCents: 0,
        deliveryFeeCents: big,
        serviceFeeCents: big,
        smallOrderSurchargeCents: big,
        totalCents: big * 3,
      });
    });
  });

  describe("result shape", () => {
    // The JSON keys and their order stay the same (API responses, snapshots).
    it("produces the same JSON", () => {
      expect(JSON.stringify(calculate(1000, settings))).toBe(
        '{"subtotalCents":1000,"deliveryFeeCents":300,"serviceFeeCents":150,' +
          '"smallOrderSurchargeCents":200,"totalCents":1650}',
      );
    });

    // The result is a plain object that holds only numbers.
    it("returns a plain object of numbers", () => {
      const result = calculate(1000, settings);
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      expect(Object.keys(result)).toHaveLength(5);
      for (const value of Object.values(result)) expect(typeof value).toBe("number");
    });

    // Extra properties on the settings do not appear in the result.
    it("ignores extra properties on the settings", () => {
      const pricing = asConfig({ ...settings, currency: "CAD", taxCents: 99 });
      expect(calculate(1000, pricing)).toEqual(calculate(1000, settings));
    });

    // Each call returns a new object, and the settings are not changed.
    it("returns a new object each time and does not modify the settings", () => {
      const input = Object.freeze({ ...settings });
      const first = calculate(1000, input);
      const second = calculate(1000, input);
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(input).toEqual(settings);
    });
  });

  describe("boundaries", () => {
    // All zeros is valid.
    it("accepts zero for every amount", () => {
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

    // Negative zero passes validation and is returned as -0.
    it("accepts -0 as a subtotal", () => {
      const result = calculate(-0, settings);
      expect(Object.is(result.subtotalCents, -0)).toBe(true);
      expect(result.totalCents).toBe(650);
    });

    // A total of exactly MAX_SAFE_INTEGER is allowed.
    it("accepts a total equal to MAX_SAFE_INTEGER", () => {
      expect(calculate(MAX - 450, settings).totalCents).toBe(MAX);
    });

    // One cent more is rejected.
    it("rejects a total of MAX_SAFE_INTEGER + 1", () => {
      expectOrderError(() => calculate(MAX - 449, settings), OVERFLOW_MESSAGE);
    });

    // A subtotal of MAX_SAFE_INTEGER is valid on its own but the fees overflow it.
    it("rejects a maximum subtotal once fees are added", () => {
      expectOrderError(() => calculate(MAX, settings), OVERFLOW_MESSAGE);
    });

    // A single setting can be MAX_SAFE_INTEGER if nothing else is added.
    it.each(["deliveryFeeCents", "serviceFeeCents"] as const)(
      "accepts %s = MAX_SAFE_INTEGER when everything else is 0",
      (field) => {
        const pricing = {
          deliveryFeeCents: 0,
          serviceFeeCents: 0,
          smallOrderThresholdCents: 0,
          smallOrderSurchargeCents: 0,
          [field]: MAX,
        };
        expect(calculate(0, pricing).totalCents).toBe(MAX);
      },
    );

    // The surcharge alone can push the total over the limit...
    it("rejects overflow caused by the surcharge", () => {
      const pricing = {
        deliveryFeeCents: 1,
        serviceFeeCents: 0,
        smallOrderThresholdCents: 1,
        smallOrderSurchargeCents: MAX,
      };
      expectOrderError(() => calculate(0, pricing), OVERFLOW_MESSAGE);
      // ...but at the threshold it is not applied, so there is no overflow.
      expect(calculate(1, pricing).totalCents).toBe(2);
    });
  });

  describe("invalid subtotal", () => {
    it.each(INVALID_AMOUNTS.map((value) => [String(value), value]))(
      "rejects subtotal %s",
      (_label, value) => {
        expectOrderError(
          () => calculate(value as number, settings),
          invalidFieldMessage("subtotalCents"),
        );
      },
    );
  });

  describe("invalid settings object", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["a number", 42],
      ["a string", "settings"],
      ["a boolean", true],
    ])("rejects settings that are %s", (_label, value) => {
      expectOrderError(() => calculate(1000, asConfig(value)), SETTINGS_REQUIRED_MESSAGE);
    });

    // An empty object or an array passes the object check, then fails on the first field.
    it.each([
      ["an empty object", {}],
      ["an array", []],
    ])("rejects settings that are %s on the first field", (_label, value) => {
      expectOrderError(
        () => calculate(1000, asConfig(value)),
        invalidFieldMessage("deliveryFeeCents"),
      );
    });
  });

  describe("invalid setting values", () => {
    for (const field of FIELDS) {
      it.each(INVALID_AMOUNTS.map((value) => [String(value), value]))(
        `rejects ${field} = %s`,
        (_label, value) => {
          expectOrderError(
            () => calculate(1000, asConfig({ ...settings, [field]: value })),
            invalidFieldMessage(field),
          );
        },
      );

      // A missing field is rejected the same way.
      it(`rejects settings with ${field} missing`, () => {
        const { [field]: _removed, ...rest } = settings;
        expectOrderError(() => calculate(1000, asConfig(rest)), invalidFieldMessage(field));
      });
    }

    // The surcharge is validated even when it would not be applied.
    it("validates the surcharge even above the threshold", () => {
      expectOrderError(
        () => calculate(5000, { ...settings, smallOrderSurchargeCents: -1 }),
        invalidFieldMessage("smallOrderSurchargeCents"),
      );
    });
  });

  describe("order of error checks", () => {
    // 1. The subtotal is checked before the settings object.
    it("reports the subtotal before missing settings", () => {
      expectOrderError(
        () => calculate(-1, asConfig(null)),
        invalidFieldMessage("subtotalCents"),
      );
    });

    // 2. The subtotal is checked before any setting value.
    it("reports the subtotal before an invalid setting", () => {
      expectOrderError(
        () => calculate(1.5, { ...settings, deliveryFeeCents: -1 }),
        invalidFieldMessage("subtotalCents"),
      );
    });

    // 3. Settings fields are checked in declaration order; the first bad one is reported.
    it.each(FIELDS.map((field, index) => [field, index]))(
      "reports %s when it and every later field are invalid",
      (field, index) => {
        const pricing: Record<string, unknown> = { ...settings };
        for (const later of FIELDS.slice(index)) pricing[later] = -1;
        expectOrderError(() => calculate(1000, asConfig(pricing)), invalidFieldMessage(field));
      },
    );

    // 4. Field validation happens before the overflow check.
    it("reports an invalid setting before an overflow", () => {
      expectOrderError(
        () => calculate(MAX, { ...settings, smallOrderSurchargeCents: -1 }),
        invalidFieldMessage("smallOrderSurchargeCents"),
      );
    });
  });
});