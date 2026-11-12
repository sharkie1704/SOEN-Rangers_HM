import type { Assignment } from "../../domain/dlv/Assignment.ts";
import type { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import type { Order } from "../../domain/ord/Order.ts";
import type { CourierStatusEvent } from "./CourierAvailabilityRepository.ts";
import type { OrderSummary } from "../../domain/prc/OrderSummary.ts";

export interface AssignmentChangeEvent {
  readonly eventId: number;
  readonly orderId: number;
  readonly courierId: string;
  readonly occurredAt: Date;
}

export interface AssignmentRepository {
  nextEventId(): Promise<number>;
  findActiveByOrderId(orderId: number): Promise<Assignment | undefined>;
  findActiveByCourierId(courierId: string): Promise<Assignment | undefined>;
  findDeclinedOrderIds(courierId: string): Promise<number[]>;
  listAccepted(): Promise<Assignment[]>;
  saveOffer(assignment: Assignment, event: AssignmentChangeEvent): Promise<void>;
  saveAccepted(assignment: Assignment, event: AssignmentChangeEvent, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void>;
  saveDeclined(assignment: Assignment, event: AssignmentChangeEvent): Promise<void>;
  // Fails with CONFLICT if the courier is no longer offline, e.g. they came back on duty meanwhile
  saveReleased(assignment: Assignment, event: AssignmentChangeEvent): Promise<void>;
  savePickup(order: Order, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void>;
  saveDelivery(
    order: Order,
    assignment: Assignment,
    event: AssignmentChangeEvent,
    courier: CourierAvailability,
    courierEvent: CourierStatusEvent,
    summary: OrderSummary | null,
  ): Promise<void>;
}
