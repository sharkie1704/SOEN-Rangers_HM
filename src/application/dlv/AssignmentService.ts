import type { Assignment } from "../../domain/dlv/Assignment.ts";
import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import { hasPermission } from "../../domain/reg/permissions";
import type { Role } from "../../domain/reg/Role.ts";
import type { OrderReadyListener } from "../ord/OrderReadyListener.ts";
import type { AssignmentRepository, AssignmentChangeEvent } from "./AssignmentRepository.ts";
import type { CourierAvailabilityRepository } from "./CourierAvailabilityRepository.ts";

export interface AssignmentActor {
  readonly userId: string;
  readonly role: Role;
}

export class AssignmentService {
  private readonly assignments: AssignmentRepository;
  private readonly couriers: CourierAvailabilityRepository;
  private readonly declinedListener?: OrderReadyListener;

  // declinedListener gets a declined order back, since it is ready for another courier again
  constructor(assignments: AssignmentRepository, couriers: CourierAvailabilityRepository, declinedListener?: OrderReadyListener) {
    this.assignments = assignments;
    this.couriers = couriers;
    this.declinedListener = declinedListener;
  }

  async accept(actor: AssignmentActor | null, orderId: number): Promise<{ assignment: Assignment; eventId: number }> {
    const assignment = await this.loadOwnOffer(actor, orderId);
    const courier = await this.couriers.findByCourierId(assignment.courierId);
    if (!courier) {
      throw new AssignmentError("NOT_FOUND", "Courier was not found.");
    }
    assignment.accept();
    const fromStatus = courier.assign();
    const event = await this.answeredEvent(assignment);
    await this.assignments.saveAccepted(assignment, event, courier, {
      eventId: await this.couriers.nextEventId(),
      courierId: courier.courierId,
      actorId: courier.courierId,
      fromStatus,
      toStatus: courier.status,
      occurredAt: event.occurredAt,
    });
    return { assignment, eventId: event.eventId };
  }

  async decline(actor: AssignmentActor | null, orderId: number): Promise<{ assignment: Assignment; eventId: number }> {
    const assignment = await this.loadOwnOffer(actor, orderId);
    assignment.decline();
    const event = await this.answeredEvent(assignment);
    await this.assignments.saveDeclined(assignment, event);
    await this.declinedListener?.orderReady(orderId);
    return { assignment, eventId: event.eventId };
  }

  private async loadOwnOffer(actor: AssignmentActor | null, orderId: number): Promise<Assignment> {
    if (!actor) {
      throw new AssignmentError("FORBIDDEN", "Only the courier who received the offer can answer it.");
    }
    const assignment = await this.assignments.findActiveByOrderId(orderId);
    if (!assignment) {
      throw new AssignmentError("NOT_FOUND", "No offer was found for this order.");
    }
    if (!hasPermission({ name: "answerOffer", courierId: assignment.courierId }, { ...actor, id: actor.userId })) {
      throw new AssignmentError("FORBIDDEN", "Only the courier who received the offer can answer it.");
    }
    return assignment;
  }

  private async answeredEvent(assignment: Assignment): Promise<AssignmentChangeEvent> {
    return {
      eventId: await this.assignments.nextEventId(),
      orderId: assignment.orderId,
      courierId: assignment.courierId,
      occurredAt: new Date(),
    };
  }
}
