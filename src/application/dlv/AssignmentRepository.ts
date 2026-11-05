import type { Assignment } from "../../domain/dlv/Assignment.ts";

export interface OfferAnsweredEvent {
  readonly eventId: number;
  readonly orderId: number;
  readonly courierId: string;
  readonly occurredAt: Date;
}

export interface AssignmentRepository {
  nextEventId(): Promise<number>;
  findActiveByOrderId(orderId: number): Promise<Assignment | undefined>;
  saveAccepted(assignment: Assignment, event: OfferAnsweredEvent): Promise<void>;
  saveDeclined(assignment: Assignment, event: OfferAnsweredEvent): Promise<void>;
}
