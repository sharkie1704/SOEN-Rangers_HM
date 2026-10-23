import type { Restaurant, RestaurantStatus } from "../../domain/ord/Restaurant.ts";

export interface RestaurantStatusEvent {
  readonly eventId: number;
  readonly restaurantId: string;
  readonly actorId: string;
  readonly fromStatus: RestaurantStatus;
  readonly toStatus: RestaurantStatus;
  readonly occurredAt: Date;
}

export interface RestaurantStatusRepository {
  nextEventId(): Promise<number>;
  findById(restaurantId: string): Promise<Restaurant | undefined>;
  // Saves the new status with its event; fails if the status changed since the restaurant was loaded
  save(restaurant: Restaurant, event: RestaurantStatusEvent): Promise<void>;
}