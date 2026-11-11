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

export interface CourierAvailabilityRepository {
  nextEventId(): Promise<number>;
  findByCourierId(courierId: string): Promise<CourierAvailability | undefined>;
  // Saves the new status with its event; fails if the status changed since the courier was loaded
  save(courier: CourierAvailability, event: CourierStatusEvent): Promise<void>;
  findCourierLocation?(courierId: string): Promise<{ lat: number; lng: number } | undefined>;
}
