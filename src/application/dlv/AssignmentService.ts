import type { Assignment } from "../../domain/dlv/Assignment.ts";
import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import { hasPermission } from "../../domain/reg/permissions";
import type { Role } from "../../domain/reg/Role.ts";
import type { AssignmentRepository } from "./AssignmentRepository.ts";

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
    if (!actor) {
      throw new AssignmentError("FORBIDDEN", "Only the courier who received the offer can answer it.");
    }
    const assignment = await this.repository.findByOrderId(orderId);
    if (!assignment) {
      throw new AssignmentError("NOT_FOUND", "No offer was found for this order.");
    }
    if (!hasPermission({ name: "answerOffer", courierId: assignment.courierId }, { ...actor, id: actor.userId })) {
      throw new AssignmentError("FORBIDDEN", "Only the courier who received the offer can answer it.");
    }
    assignment.accept();
    const eventId = await this.repository.nextEventId();
    await this.repository.saveAccepted(assignment, {
      eventId,
      orderId: assignment.orderId,
      courierId: assignment.courierId,
      occurredAt: new Date(),
    });
    return { assignment, eventId };
  }
}
