import { Assignment, type AssignmentStatus } from "../../../domain/dlv/Assignment.ts";
import { AssignmentError } from "../../../domain/dlv/AssignmentError.ts";
import { CourierAvailability } from "../../../domain/dlv/CourierAvailability.ts";
import type { Order } from "../../../domain/ord/Order.ts";
import type { AssignmentChangeEvent, AssignmentRepository } from "../AssignmentRepository.ts";
import { CourierError } from "../../../domain/dlv/CourierError.ts";
import type { CourierStatus } from "../../../domain/dlv/states/CourierState.ts";
import type { CourierAvailabilityRepository, CourierStatusEvent } from "../CourierAvailabilityRepository.ts";
import type { OrderSummary } from "../../../domain/prc/OrderSummary.ts";

// Stores statuses rather than live objects, so save() can refuse stale changes like the real repository
export class InMemoryCourierAvailabilityRepository implements CourierAvailabilityRepository {
  statuses = new Map<string, CourierStatus>();
  events: CourierStatusEvent[] = [];
  private eventSeq = 0;

  withCourier(id: string, status: CourierStatus = "OFFLINE"): this {
    this.statuses.set(id, status);
    return this;
  }

  async nextEventId(): Promise<number> { return ++this.eventSeq; }

  async findByCourierId(courierId: string): Promise<CourierAvailability | undefined> {
    const status = this.statuses.get(courierId);
    return status ? new CourierAvailability(courierId, status) : undefined;
  }

  async save(courier: CourierAvailability, event: CourierStatusEvent): Promise<void> {
    if (this.statuses.get(courier.courierId) !== event.fromStatus) {
      throw new CourierError("CONFLICT", "Courier status just changed. Reload it and try again.");
    }
    this.statuses.set(courier.courierId, courier.status);
    this.events.push(event);
  }
}

export class InMemoryAssignmentRepository implements AssignmentRepository {
  readonly assignments = new Map<number, Assignment>();
  readonly accepted: AssignmentChangeEvent[] = [];
  readonly declined: AssignmentChangeEvent[] = [];
  readonly completed: AssignmentChangeEvent[] = [];
  readonly offered: AssignmentChangeEvent[] = [];
  readonly released: AssignmentChangeEvent[] = [];
  private readonly declinedPairs = new Set<string>();
  readonly summaries: OrderSummary[] = [];
  private eventSeq = 0;

  constructor(private readonly couriers: InMemoryCourierAvailabilityRepository) {}

  withAssignment(orderId: number, courierId: string, status: AssignmentStatus = "Offered"): this {
    this.assignments.set(orderId, new Assignment(orderId, courierId, status));
    if (status === "Declined") this.declinedPairs.add(`${orderId}:${courierId}`);
    return this;
  }

  async nextEventId(): Promise<number> { return ++this.eventSeq; }

  async findActiveByOrderId(orderId: number): Promise<Assignment | undefined> {
    const assignment = this.assignments.get(orderId);
    return assignment?.status === "Offered" || assignment?.status === "Accepted" ? assignment : undefined;
  }

  async findActiveByCourierId(courierId: string): Promise<Assignment | undefined> {
    return [...this.assignments.values()].find((a) => a.courierId === courierId && (a.status === "Offered" || a.status === "Accepted"));
  }

  async findDeclinedOrderIds(courierId: string): Promise<number[]> {
    return [...this.declinedPairs].filter((pair) => pair.endsWith(`:${courierId}`)).map((pair) => Number(pair.split(":")[0]));
  }

  async listAccepted(): Promise<Assignment[]> {
    return [...this.assignments.values()].filter((a) => a.status === "Accepted").sort((a, b) => a.orderId - b.orderId);
  }

  async saveOffer(assignment: Assignment, event: AssignmentChangeEvent): Promise<void> {
    if (this.couriers.statuses.get(assignment.courierId) !== "IDLE") {
      throw new AssignmentError("CONFLICT", "This courier is no longer free.");
    }
    if (await this.findActiveByOrderId(assignment.orderId) || await this.findActiveByCourierId(assignment.courierId)) {
      throw new AssignmentError("CONFLICT", "This order or courier already has an active offer.");
    }
    this.assignments.set(assignment.orderId, assignment);
    this.offered.push(event);
  }

  async saveAccepted(_assignment: Assignment, event: AssignmentChangeEvent, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void> {
    await this.couriers.save(courier, courierEvent);
    this.accepted.push(event);
  }

  async saveDeclined(assignment: Assignment, event: AssignmentChangeEvent): Promise<void> {
    this.declinedPairs.add(`${assignment.orderId}:${assignment.courierId}`);
    this.declined.push(event);
  }

  async saveReleased(_assignment: Assignment, event: AssignmentChangeEvent): Promise<void> {
    this.released.push(event);
  }

  async savePickup(_order: Order, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void> {
    await this.couriers.save(courier, courierEvent);
  }

  async saveDelivery(
    _order: Order,
    _assignment: Assignment,
    event: AssignmentChangeEvent,
    courier: CourierAvailability,
    courierEvent: CourierStatusEvent,
    summary: OrderSummary | null,
  ): Promise<void> {
    await this.couriers.save(courier, courierEvent);
    this.completed.push(event);
    if (summary) this.summaries.push(summary);
  }
}
