import type { Assignment } from "../../domain/dlv/Assignment.ts";
import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import type { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import type { CourierStatus } from "../../domain/dlv/states/CourierState.ts";
import type { Order } from "../../domain/ord/Order.ts";
import { hasPermission } from "../../domain/reg/permissions";
import type { OrderRepository } from "../ord/OrderRepository.ts";
import type { AssignmentRepository } from "./AssignmentRepository.ts";
import type { AssignmentActor } from "./AssignmentService.ts";
import type { CourierAvailabilityRepository, CourierStatusEvent } from "./CourierAvailabilityRepository.ts";
import type { CourierIdleSubject } from "./CourierIdleSubject.ts";

export interface HandoffResult {
  readonly order: Order;
  readonly courier: CourierAvailability;
}

export class HandoffService {
  constructor(
    private readonly assignments: AssignmentRepository,
    private readonly couriers: CourierAvailabilityRepository,
    private readonly orders: OrderRepository,
    private readonly idle?: CourierIdleSubject,
  ) {}

  async pickUp(actor: AssignmentActor | null, orderId: number): Promise<HandoffResult> {
    const { order, courier } = await this.loadOwnDelivery(actor, orderId);
    const orderEvent = order.pickUp(courier.courierId, await this.orders.nextEventId());
    const fromStatus = courier.pickUp();
    await this.assignments.savePickup(order, courier, await this.courierEvent(courier, fromStatus, orderEvent.occurredAt));
    return { order, courier };
  }

  async deliver(actor: AssignmentActor | null, orderId: number): Promise<HandoffResult> {
    const { assignment, order, courier } = await this.loadOwnDelivery(actor, orderId);
    const orderEvent = order.deliver(courier.courierId, await this.orders.nextEventId());
    const fromStatus = courier.completeDelivery();
    assignment.complete();
    await this.assignments.saveDelivery(
      order,
      assignment,
      { eventId: await this.assignments.nextEventId(), orderId, courierId: courier.courierId, occurredAt: orderEvent.occurredAt },
      courier,
      await this.courierEvent(courier, fromStatus, orderEvent.occurredAt),
    );
    await this.idle?.notify(courier.courierId);
    return { order, courier };
  }

  private async loadOwnDelivery(actor: AssignmentActor | null, orderId: number): Promise<{ assignment: Assignment; order: Order; courier: CourierAvailability }> {
    if (!actor) {
      throw new AssignmentError("FORBIDDEN", "Only the courier assigned to this order can confirm the handoff.");
    }
    const assignment = await this.assignments.findActiveByOrderId(orderId);
    if (!assignment) {
      throw new AssignmentError("NOT_FOUND", "No courier is assigned to this order.");
    }
    if (!hasPermission({ name: "confirmHandoff", courierId: assignment.courierId }, { ...actor, id: actor.userId })) {
      throw new AssignmentError("FORBIDDEN", "Only the courier assigned to this order can confirm the handoff.");
    }
    if (assignment.status !== "Accepted") {
      throw new AssignmentError("INVALID_TRANSITION", "Accept the offer before confirming the handoff.");
    }
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new AssignmentError("NOT_FOUND", "Order was not found.");
    }
    const courier = await this.couriers.findByCourierId(assignment.courierId);
    if (!courier) {
      throw new AssignmentError("NOT_FOUND", "Courier was not found.");
    }
    return { assignment, order, courier };
  }

  private async courierEvent(courier: CourierAvailability, fromStatus: CourierStatus, occurredAt: Date): Promise<CourierStatusEvent> {
    return {
      eventId: await this.couriers.nextEventId(),
      courierId: courier.courierId,
      actorId: courier.courierId,
      fromStatus,
      toStatus: courier.status,
      occurredAt,
    };
  }
}
