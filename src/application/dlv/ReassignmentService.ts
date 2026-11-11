import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import { hasPermission } from "../../domain/reg/permissions";
import type { OrderRepository } from "../ord/OrderRepository.ts";
import type { AssignmentRepository } from "./AssignmentRepository.ts";
import type { AssignmentActor } from "./AssignmentService.ts";
import type { CourierAvailabilityRepository } from "./CourierAvailabilityRepository.ts";
import type { CourierIdleObserver } from "./CourierIdleSubject.ts";

export interface ReassignmentResult {
  readonly orderId: number;
  readonly releasedCourierId: string;
  readonly offeredTo: string | null;
}

export interface StalledOrder {
  readonly orderId: number;
  readonly restaurantId: string;
  readonly courierId: string;
}

export class ReassignmentService {
  constructor(
    private readonly assignments: AssignmentRepository,
    private readonly couriers: CourierAvailabilityRepository,
    private readonly orders: OrderRepository,
    private readonly dispatch: CourierIdleObserver,
  ) {}

  async listStalled(actor: AssignmentActor | null): Promise<StalledOrder[]> {
    this.requireOperator(actor);
    const stalled: StalledOrder[] = [];
    for (const assignment of await this.assignments.listAccepted()) {
      const order = await this.orders.findById(assignment.orderId);
      if (order?.status !== "Ready") continue;
      const courier = await this.couriers.findByCourierId(assignment.courierId);
      if (courier && courier.status !== "OFFLINE") continue;
      stalled.push({ orderId: order.id, restaurantId: order.restaurantId, courierId: assignment.courierId });
    }
    return stalled;
  }

  async reassign(actor: AssignmentActor | null, orderId: number): Promise<ReassignmentResult> {
    this.requireOperator(actor);
    const assignment = await this.assignments.findActiveByOrderId(orderId);
    if (!assignment) {
      throw new AssignmentError("NOT_FOUND", "No courier is assigned to this order.");
    }
    if (assignment.status !== "Accepted") {
      throw new AssignmentError("INVALID_TRANSITION", "Only an order with an accepted courier can be reassigned.");
    }
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new AssignmentError("NOT_FOUND", "Order was not found.");
    }
    if (order.status !== "Ready") {
      throw new AssignmentError("INVALID_TRANSITION", "Only a ready order waiting for pickup can be reassigned.");
    }
    const courier = await this.couriers.findByCourierId(assignment.courierId);
    if (courier && courier.status !== "OFFLINE") {
      throw new AssignmentError("INVALID_TRANSITION", "The courier is still on duty, so the order is not stalled.");
    }

    assignment.release();
    await this.assignments.saveReleased(assignment, {
      eventId: await this.assignments.nextEventId(),
      orderId,
      courierId: assignment.courierId,
      occurredAt: new Date(),
    });

    return { orderId, releasedCourierId: assignment.courierId, offeredTo: await this.dispatchAgain(orderId) };
  }

  private requireOperator(actor: AssignmentActor | null): void {
    if (!actor || !hasPermission({ name: "reassignOrder" }, { ...actor, id: actor.userId })) {
      throw new AssignmentError("FORBIDDEN", "Only an operator can reassign an order.");
    }
  }

  private async dispatchAgain(orderId: number): Promise<string | null> {
    try {
      for (const courierId of await this.couriers.listIdleCourierIds()) {
        await this.dispatch.courierBecameIdle(courierId);
        const offer = await this.assignments.findActiveByOrderId(orderId);
        if (offer) return offer.courierId;
      }
    } catch (error) {
      console.error("Dispatch after reassignment failed:", error);
    }
    return null;
  }
}
