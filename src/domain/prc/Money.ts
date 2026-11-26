import { OrderError } from "../ord/OrderError.ts";

export class Money {
  static readonly ZERO = new Money(0);

  readonly #cents: number;

  private constructor(cents: number) {
    this.#cents = cents;
  }

  static fromCents(cents: number, field: string): Money {
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new OrderError(
        "INVALID_INPUT",
        `${field} must be a non-negative safe integer in cents.`,
      );
    }
    return new Money(cents);
  }

  plus(other: Money): Money {
    const cents = this.#cents + other.#cents;
    if (!Number.isSafeInteger(cents)) {
      throw new OrderError("INVALID_INPUT", "Fare total exceeds the supported amount.");
    }
    return new Money(cents);
  }

  minus(other: Money): Money {
    if (other.#cents > this.#cents) {
      throw new OrderError("INVALID_INPUT", "An amount cannot go below zero.");
    }
    return new Money(this.#cents - other.#cents);
  }

  percent(percentage: number): Money {
    return new Money(Math.floor((this.#cents * percentage) / 100));
  }

  isLessThan(other: Money): boolean {
    return this.#cents < other.#cents;
  }

  toCents(): number {
    return this.#cents;
  }
}
