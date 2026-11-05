import type { Assignment } from "../../domain/dlv/Assignment.ts";

export interface OfferAcceptedEvent {
  readonly eventId: number;
  readonly orderId: number;
  readonly courierId: string;
  readonly occurredAt: Date;
}

export interface AssignmentRepository {
  nextEventId(): Promise<number>;
  findByOrderId(orderId: number): Promise<Assignment | undefined>;
  saveAccepted(assignment: Assignment, event: OfferAcceptedEvent): Promise<void>;
}
