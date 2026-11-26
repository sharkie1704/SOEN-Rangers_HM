import type { Rating } from "../../domain/rvw/Rating.ts";

export interface RatingRepository {
  existsForOrder(orderId: number): Promise<boolean>;
  findRatedOrderIds(customerId: string): Promise<readonly number[]>;
  averageCourierScore(courierId: string): Promise<{ readonly average: number; readonly count: number } | null>;
  // Recheck delivery eligibility atomically with the insert.
  create(rating: Rating): Promise<void>;
}
