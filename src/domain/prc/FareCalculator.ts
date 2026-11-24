
import { OrderError } from "../ord/OrderError.ts";
import type { FareBreakdown } from "./FareBreakdown.ts";
import { Money } from "./Money.ts";

// Platform pricing settings, with all amounts in cents.
export interface PricingConfig {
  readonly deliveryFeeCents: number;
  readonly serviceFeeCents: number;
  readonly smallOrderThresholdCents: number;
  readonly smallOrderSurchargeCents: number;
}

export function calculate(
  subtotalCents: number,
  settings: PricingConfig,
): FareBreakdown {
  const subtotal = Money.fromCents(subtotalCents, "subtotalCents");

  if (!settings || typeof settings !== "object") {
    throw new OrderError("INVALID_INPUT", "Pricing settings are required.");
  }

  const pricing = {
    deliveryFee: Money.fromCents(settings.deliveryFeeCents, "deliveryFeeCents"),
    serviceFee: Money.fromCents(settings.serviceFeeCents, "serviceFeeCents"),
    smallOrderThreshold: Money.fromCents(
      settings.smallOrderThresholdCents,
      "smallOrderThresholdCents",
    ),
    smallOrderSurcharge: Money.fromCents(
      settings.smallOrderSurchargeCents,
      "smallOrderSurchargeCents",
    ),
  };

  const smallOrderSurcharge = subtotal.isLessThan(pricing.smallOrderThreshold)
    ? pricing.smallOrderSurcharge
    : Money.ZERO;

  const total = subtotal
    .plus(pricing.deliveryFee)
    .plus(pricing.serviceFee)
    .plus(smallOrderSurcharge);

  return {
    subtotalCents: subtotal.toCents(),
    deliveryFeeCents: pricing.deliveryFee.toCents(),
    serviceFeeCents: pricing.serviceFee.toCents(),
    smallOrderSurchargeCents: smallOrderSurcharge.toCents(),
    totalCents: total.toCents(),
  };
}
