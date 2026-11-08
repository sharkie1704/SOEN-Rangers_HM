import type { CourierCandidate, Position } from "../../domain/dlv/DispatchRule.ts";

export interface DispatchRepository {
  // Undefined when the restaurant has no position, so no distance can be measured
  findRestaurantPosition(restaurantId: string): Promise<Position | undefined>;
  // Idle couriers who have a position, hold no active offer or delivery, and have not declined this order
  findCandidates(orderId: number): Promise<CourierCandidate[]>;
}
