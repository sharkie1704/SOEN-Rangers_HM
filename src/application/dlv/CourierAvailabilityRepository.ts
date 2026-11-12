import type { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import type { CourierStatus } from "../../domain/dlv/states/CourierState.ts";

export interface CourierStatusEvent {
  readonly eventId: number;
  readonly courierId: string;
  readonly actorId: string;
  readonly fromStatus: CourierStatus;
  readonly toStatus: CourierStatus;
  readonly occurredAt: Date;
}

export interface RestaurantMapCourier {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
  readonly status: CourierStatus;
  readonly hasDelivery: boolean;
}

export interface CourierAvailabilityRepository {
  nextEventId(): Promise<number>;
  findByCourierId(courierId: string): Promise<CourierAvailability | undefined>;
  // Saves the new status with its event; fails if the status changed since the courier was loaded
  save(courier: CourierAvailability, event: CourierStatusEvent): Promise<void>;
  // Like save, but also fails with CONFLICT if the courier no longer has an accepted delivery,
  // e.g. an operator reassigned it while the courier was coming back on duty
  saveResumedDelivery(courier: CourierAvailability, event: CourierStatusEvent): Promise<void>;
  findCourierLocation?(courierId: string): Promise<{ lat: number; lng: number } | undefined>;
  findForRestaurantMap?(restaurantId: string): Promise<RestaurantMapCourier[]>;
}
