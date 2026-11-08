
import { OrderError } from "../ord/OrderError.ts";
import type { FareBreakdown } from "./FareBreakdown.ts";

// Platform pricing settings, with all amounts in cents.
export interface PricingConfig {
  readonly deliveryFeeCents: number;
  readonly serviceFeeCents: number;
  readonly smallOrderThresholdCents: number;
  readonly smallOrderSurchargeCents: number;
}

function validateCents(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new OrderError(
      "INVALID_INPUT",
      `${field} must be a non-negative safe integer in cents.`,
    );
  }
}

export function calculate(
  subtotalCents: number,
  settings: PricingConfig,
): FareBreakdown {
  validateCents(subtotalCents, "subtotalCents");

  if (!settings || typeof settings !== "object") {
    throw new OrderError("INVALID_INPUT", "Pricing settings are required.");
  }

  validateCents(settings.deliveryFeeCents, "deliveryFeeCents");
  validateCents(settings.serviceFeeCents, "serviceFeeCents");
  validateCents(
    settings.smallOrderThresholdCents,
    "smallOrderThresholdCents",
  );
  validateCents(
    settings.smallOrderSurchargeCents,
    "smallOrderSurchargeCents",
  );

  // Apply surcharge only when the subtotal is below the threshold.
  const smallOrderSurchargeCents =
    subtotalCents < settings.smallOrderThresholdCents
      ? settings.smallOrderSurchargeCents
      : 0;

  const totalCents =
    subtotalCents +
    settings.deliveryFeeCents +
    settings.serviceFeeCents +
    smallOrderSurchargeCents;

  if (!Number.isSafeInteger(totalCents)) {
    throw new OrderError(
      "INVALID_INPUT",
      "Fare total exceeds the supported amount.",
    );
  }

  return {
    subtotalCents,
    deliveryFeeCents: settings.deliveryFeeCents,
    serviceFeeCents: settings.serviceFeeCents,
    smallOrderSurchargeCents,
    totalCents,
  };
}
