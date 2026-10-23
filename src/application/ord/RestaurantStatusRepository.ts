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
  save(restaurant: Restaurant): Promise<void>;
  recordEvent(event: RestaurantStatusEvent): Promise<void>;
}