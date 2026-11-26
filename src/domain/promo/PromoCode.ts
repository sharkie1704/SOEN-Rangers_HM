import { OrderError } from "../ord/OrderError.ts";
import type { FareBreakdown } from "../prc/FareBreakdown.ts";
import { Money } from "../prc/Money.ts";

export function normalizePromoCode(code: unknown): string {
  if (typeof code !== "string" || code.trim() === "") {
    throw new OrderError("INVALID_INPUT", "Enter a promo code.");
  }
  return code.trim().toUpperCase();
}

export class PromoCode {
  readonly code: string;
  readonly type: "percent" | "fixed";
  readonly value: number;
  readonly minOrder: Money;
  readonly expiresAt: Date;

  constructor(
    code: string,
    type: "percent" | "fixed",
    value: number,
    minOrder: Money,
    expiresAt: Date,
  ) {
    if (type !== "percent" && type !== "fixed") {
      throw new OrderError("INVALID_INPUT", "Promo type must be percent or fixed.");
    }
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new OrderError("INVALID_INPUT", "Promo value must be a non-negative safe integer.");
    }
    if (type === "percent" && (value < 1 || value > 100)) {
      throw new OrderError("INVALID_INPUT", "Percent promo value must be from 1 to 100.");
    }
    if (Number.isNaN(expiresAt.getTime())) {
      throw new OrderError("INVALID_INPUT", "Promo expiry must be a valid date.");
    }
    this.code = normalizePromoCode(code);
    this.type = type;
    this.value = value;
    this.minOrder = minOrder;
    this.expiresAt = new Date(expiresAt);
  }

  discountFor(subtotal: Money): Money {
    const discount = this.type === "percent"
      ? subtotal.percent(this.value).toCents()
      : this.value;
    const capped = Math.min(subtotal.toCents(), discount);
    return Money.fromCents(capped, "discountCents");
  }

  validateFor(subtotal: Money, now: Date = new Date()): void {
    if (now.getTime() > this.expiresAt.getTime()) {
      throw new OrderError("INVALID_INPUT", `Promo code ${this.code} has expired.`);
    }
    if (subtotal.isLessThan(this.minOrder)) {
      throw new OrderError("INVALID_INPUT", `Promo code ${this.code} requires a minimum order of $${(this.minOrder.toCents() / 100).toFixed(2)}.`);
    }
  }

  applyTo(fare: FareBreakdown): FareBreakdown {
    if (fare.promo) {
      throw new OrderError("CONFLICT", `An order already has promo code ${fare.promo.code}; only one promo code is allowed.`);
    }
    this.validateFor(Money.fromCents(fare.subtotalCents, "subtotalCents"));
    const discount = this.discountFor(Money.fromCents(fare.subtotalCents, "subtotalCents"));
    const total = Money.fromCents(fare.totalCents, "totalCents").minus(discount);
    return {
      ...fare,
      totalCents: total.toCents(),
      promo: { code: this.code, discountCents: discount.toCents() },
    };
  }
}
