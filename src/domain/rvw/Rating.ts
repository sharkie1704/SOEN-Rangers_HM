import { OrderError, requireId, requireStringId } from "../ord/OrderError.ts";

export interface RatingScale {
  readonly min: number;
  readonly max: number;
}

interface RatingInput {
  readonly orderId: number;
  readonly customerId: string;
  readonly restaurantId: string;
  readonly courierId: string;
  readonly restaurantScore: number;
  readonly courierScore: number;
}

export class Rating {
  readonly orderId: number;
  readonly customerId: string;
  readonly restaurantId: string;
  readonly courierId: string;
  readonly restaurantScore: number;
  readonly courierScore: number;
  readonly #createdAt: Date;

  constructor(input: RatingInput, scale: RatingScale, createdAt = new Date()) {
    this.orderId = requireId(input.orderId, "Order ID");
    this.customerId = requireStringId(input.customerId, "Customer ID");
    this.restaurantId = requireStringId(input.restaurantId, "Restaurant ID");
    this.courierId = requireStringId(input.courierId, "Courier ID");
    this.restaurantScore = requireScore(input.restaurantScore, "Restaurant score", scale);
    this.courierScore = requireScore(input.courierScore, "Courier score", scale);
    this.#createdAt = new Date(createdAt);
    Object.freeze(this);
  }

  get createdAt(): Date {
    return new Date(this.#createdAt);
  }
}

function requireScore(score: number, field: string, { min, max }: RatingScale): number {
  if (!Number.isSafeInteger(score) || score < min || score > max) {
    throw new OrderError("INVALID_INPUT", `${field} must be a whole number between ${min} and ${max}.`);
  }
  return score;
}
