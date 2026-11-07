import { Assignment } from "../../domain/dlv/Assignment.ts";
import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import { rankCouriers } from "../../domain/dlv/DispatchRule.ts";
import type { OrderReadyListener } from "../ord/OrderReadyListener.ts";
import type { OrderRepository } from "../ord/OrderRepository.ts";
import type { AssignmentRepository } from "./AssignmentRepository.ts";
import type { DispatchRepository } from "./DispatchRepository.ts";

// Applies the dispatch rule: a ready order is offered to the nearest free courier.
// An order no courier can take stays ready with no offer, which is the dispatch queue.
export class DispatchService implements OrderReadyListener {
  constructor(
    private readonly orders: OrderRepository,
    private readonly assignments: AssignmentRepository,
    private readonly dispatch: DispatchRepository,
  ) {}

  async orderReady(orderId: number): Promise<void> {
    try {
      await this.offer(orderId);
    } catch (error) {
      console.error(`[DLV] Could not offer order ${orderId}; it stays in the dispatch queue.`, error);
    }
  }

  // Returns the order's active assignment, or undefined when the order has to wait for a courier
  async offer(orderId: number): Promise<Assignment | undefined> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new AssignmentError("NOT_FOUND", "Order was not found.");
    }
    if (order.status !== "Ready") {
      throw new AssignmentError("INVALID_TRANSITION", "Only a ready order can be offered to a courier.");
    }
    const active = await this.assignments.findActiveByOrderId(orderId);
    if (active) return active;

    const restaurant = await this.dispatch.findRestaurantPosition(order.restaurantId);
    if (!restaurant) {
      console.info(`[DLV] orderId=${orderId} waiting: restaurant ${order.restaurantId} has no position`);
      return undefined;
    }
    for (const candidate of rankCouriers(restaurant, await this.dispatch.findCandidates(orderId))) {
      const assignment = new Assignment(orderId, candidate.courierId);
      const eventId = await this.assignments.nextEventId();
      try {
        await this.assignments.saveOffer(assignment, { eventId, orderId, courierId: candidate.courierId, occurredAt: new Date() });
      } catch (error) {
        if (!(error instanceof AssignmentError && error.code === "CONFLICT")) throw error;
        // Another offer got there first: either this order is taken, or this courier is, so try the next one
        const taken = await this.assignments.findActiveByOrderId(orderId);
        if (taken) return taken;
        continue;
      }
      console.info(`[DLV] eventId=${eventId} action=offer orderId=${orderId} courierId=${candidate.courierId}`);
      return assignment;
    }
    console.info(`[DLV] orderId=${orderId} waiting: no free courier`);
    return undefined;
  }
}
