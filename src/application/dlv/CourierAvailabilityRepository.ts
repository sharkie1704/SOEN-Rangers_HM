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

// One courier as the operator's map and dashboard see them
export interface CourierOverview {
  readonly id: string;
  readonly name: string;
  readonly status: CourierStatus;
  readonly onDuty: boolean;
  // Could be offered an order right now: idle, holding no offer or delivery, and with a position
  readonly available: boolean;
  readonly location: { readonly lat: number; readonly lng: number } | null;
  // The order the courier has been offered or is delivering, if any
  readonly activeOrderId: number | null;
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
  // Every courier, on duty or not, ordered by name
  listOverview(): Promise<CourierOverview[]>;
}
