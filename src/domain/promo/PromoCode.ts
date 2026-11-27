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
  readonly percentOff: number;
  readonly minOrder: Money;
  readonly expiresAt: Date;

  constructor(code: string, percentOff: number, minOrder: Money, expiresAt: Date) {
    if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) {
      throw new OrderError("INVALID_INPUT", "Percent off must be a whole number from 1 to 100.");
    }
    if (Number.isNaN(expiresAt.getTime())) {
      throw new OrderError("INVALID_INPUT", "Promo expiry must be a valid date.");
    }
    this.code = normalizePromoCode(code);
    this.percentOff = percentOff;
    this.minOrder = minOrder;
    this.expiresAt = new Date(expiresAt);
  }

  isExpired(now: Date = new Date()): boolean {
    if (Number.isNaN(now.getTime())) {
      throw new OrderError("INVALID_INPUT", "Current time must be a valid date.");
    }
    return now.getTime() > this.expiresAt.getTime();
  }

  discountFor(subtotal: Money, now: Date = new Date()): Money {
    if (this.isExpired(now)) {
      throw new OrderError("INVALID_INPUT", `Promo code ${this.code} has expired.`);
    }
    if (subtotal.isLessThan(this.minOrder)) {
      const minimum = (this.minOrder.toCents() / 100).toFixed(2);
      throw new OrderError("INVALID_INPUT", `Promo code ${this.code} requires a minimum order of $${minimum}.`);
    }
    return subtotal.percent(this.percentOff);
  }

  applyTo(fare: FareBreakdown, now: Date = new Date()): FareBreakdown {
    const discount = this.discountFor(Money.fromCents(fare.subtotalCents, "subtotalCents"), now);
    const total = Money.fromCents(fare.totalCents, "totalCents").minus(discount);
    return {
      ...fare,
      totalCents: total.toCents(),
      promo: { code: this.code, discountCents: discount.toCents() },
    };
  }
}
