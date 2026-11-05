import type { Assignment } from "../../domain/dlv/Assignment.ts";
import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import { hasPermission } from "../../domain/reg/permissions";
import type { Role } from "../../domain/reg/Role.ts";
import type { AssignmentRepository, OfferAnsweredEvent } from "./AssignmentRepository.ts";

export interface AssignmentActor {
  readonly userId: string;
  readonly role: Role;
}

export class AssignmentService {
  private readonly repository: AssignmentRepository;

  constructor(repository: AssignmentRepository) {
    this.repository = repository;
  }

  async accept(actor: AssignmentActor | null, orderId: number): Promise<{ assignment: Assignment; eventId: number }> {
    const assignment = await this.loadOwnOffer(actor, orderId);
    assignment.accept();
    const event = await this.answeredEvent(assignment);
    await this.repository.saveAccepted(assignment, event);
    return { assignment, eventId: event.eventId };
  }

  async decline(actor: AssignmentActor | null, orderId: number): Promise<{ assignment: Assignment; eventId: number }> {
    const assignment = await this.loadOwnOffer(actor, orderId);
    assignment.decline();
    const event = await this.answeredEvent(assignment);
    await this.repository.saveDeclined(assignment, event);
    return { assignment, eventId: event.eventId };
  }

  private async loadOwnOffer(actor: AssignmentActor | null, orderId: number): Promise<Assignment> {
    if (!actor) {
      throw new AssignmentError("FORBIDDEN", "Only the courier who received the offer can answer it.");
    }
    const assignment = await this.repository.findActiveByOrderId(orderId);
    if (!assignment) {
      throw new AssignmentError("NOT_FOUND", "No offer was found for this order.");
    }
    if (!hasPermission({ name: "answerOffer", courierId: assignment.courierId }, { ...actor, id: actor.userId })) {
      throw new AssignmentError("FORBIDDEN", "Only the courier who received the offer can answer it.");
    }
    return assignment;
  }

  private async answeredEvent(assignment: Assignment): Promise<OfferAnsweredEvent> {
    return {
      eventId: await this.repository.nextEventId(),
      orderId: assignment.orderId,
      courierId: assignment.courierId,
      occurredAt: new Date(),
    };
  }
}
