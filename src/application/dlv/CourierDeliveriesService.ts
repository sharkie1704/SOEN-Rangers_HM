import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import type { Order } from "../../domain/ord/Order.ts";
import type { Assignment } from "../../domain/dlv/Assignment.ts";
import { hasPermission } from "../../domain/reg/permissions";
import { Role } from "../../domain/reg/Role.ts";
import type { OrderRepository } from "../ord/OrderRepository.ts";
import type { AssignmentActor } from "./AssignmentService.ts";
import type { AssignmentRepository } from "./AssignmentRepository.ts";

export interface CourierDelivery {
  readonly assignment: Assignment;
  readonly order: Order;
}

export class CourierDeliveriesService {
  constructor(
    private readonly assignments: AssignmentRepository,
    private readonly orders: OrderRepository,
  ) {}

  async current(actor: AssignmentActor | null): Promise<readonly CourierDelivery[]> {
    if (!actor || actor.role !== Role.COURIER || !actor.userId.trim()) {
      throw new AssignmentError("FORBIDDEN", "Only an authenticated courier can view assigned deliveries.");
    }

    const assignment = await this.assignments.findActiveByCourierId(actor.userId);
    if (!assignment) return [];
    if (!hasPermission(
      { name: "answerOffer", courierId: assignment.courierId },
      { ...actor, id: actor.userId },
    )) {
      throw new AssignmentError("FORBIDDEN", "Only the assigned courier can view this delivery.");
    }

    const order = await this.orders.findById(assignment.orderId);
    if (!order) throw new AssignmentError("NOT_FOUND", "The assigned order was not found.");

    return [{ assignment, order }];
  }
}
