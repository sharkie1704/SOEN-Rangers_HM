import type { Assignment } from "../../domain/dlv/Assignment.ts";
import type { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import type { CourierStatusEvent } from "./CourierAvailabilityRepository.ts";

export interface OfferAnsweredEvent {
  readonly eventId: number;
  readonly orderId: number;
  readonly courierId: string;
  readonly occurredAt: Date;
}

export interface AssignmentRepository {
  nextEventId(): Promise<number>;
  findActiveByOrderId(orderId: number): Promise<Assignment | undefined>;
  saveAccepted(assignment: Assignment, event: OfferAnsweredEvent, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void>;
  saveDeclined(assignment: Assignment, event: OfferAnsweredEvent): Promise<void>;
}
