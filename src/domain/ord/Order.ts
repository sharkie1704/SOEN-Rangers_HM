import { OrderError, requireId, requireStringId, requireText } from "./OrderError.ts";
import { OrderLine } from "./OrderLine.ts";
import type { CreateOrderDTO } from "./CreateOrderDTO.ts";
import type { RestoredOrderDTO } from "./RestoredOrderDTO.ts";
import type { OrderAction, OrderStatus, StateChangeEvent } from "./StateChangeEvent.ts";
import { OrderState } from "./states/OrderState.ts";
import { PlacedState } from "./states/PlacedState.ts";
import { stateFor } from "./states/stateFor.ts";

export class Order {
  readonly id: number;
  readonly restaurantId: string;
  readonly customerId: string;
  readonly lines: readonly OrderLine[];
  readonly #placedAt: Date;
  #state: OrderState = new PlacedState();
  #events: StateChangeEvent[] = [];

  constructor(input: CreateOrderDTO, placedAt: Date = new Date(), placedEvent?: { actorId: string; eventId: number }) {
    this.id = requireId(input.id, "Order ID");
    this.restaurantId = requireStringId(input.restaurantId, "Restaurant ID");
    this.customerId = requireStringId(input.customerId, "Customer ID");
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new OrderError("INVALID_INPUT", "An order must contain at least one item.");
    }
    this.lines = Object.freeze(input.lines.map((line) => new OrderLine(line)));
    if (!Number.isSafeInteger(this.totalCents)) {
      throw new OrderError("INVALID_INPUT", "Order total exceeds the supported amount.");
    }
    this.#placedAt = new Date(placedAt);
    if (placedEvent) {
      this.#events.push(Object.freeze({
        eventId: requireId(placedEvent.eventId, "Event ID"),
        orderId: this.id,
        actorId: requireStringId(placedEvent.actorId, "Actor ID"),
        action: "place",
        from: "Placed",
        to: "Placed",
        occurredAt: new Date(this.#placedAt),
      }));
    }
    Object.freeze(this);
  }

  // Rebuilds an order loaded from storage without replaying its transitions
  static restore(input: RestoredOrderDTO): Order {
    const order = new Order(input, input.placedAt);
    order.#state = stateFor(input.status);
    order.#events = input.events.map((event) => order.copyEvent(event));
    return order;
  }

  get placedAt(): Date {
    return new Date(this.#placedAt);
  }

  get status(): OrderStatus {
    return this.#state.status;
  }

  get totalCents(): number {
    return this.lines.reduce((total, line) => total + line.totalCents, 0);
  }

  get events(): readonly StateChangeEvent[] {
    return Object.freeze(this.#events.map((event) => this.copyEvent(event)));
  }

  get rejectionReason(): string | undefined {
    return this.#events.find((event) => event.action === "reject")?.reason;
  }

  accept(actorId: string, eventId: number): StateChangeEvent {
    return this.transition(this.#state.accept(), "accept", actorId, eventId);
  }

  reject(actorId: string, reason: string, eventId: number): StateChangeEvent {
    return this.transition(this.#state.reject(), "reject", actorId, eventId, requireText(reason, "Rejection reason"));
  }

  cancel(actorId: string, eventId: number): StateChangeEvent {
    return this.transition(this.#state.cancel(), "cancel", actorId, eventId);
  }

  startPreparing(actorId: string, eventId: number): StateChangeEvent {
    return this.transition(this.#state.startPreparing(), "start-preparing", actorId, eventId);
  }

  markReady(actorId: string, eventId: number): StateChangeEvent {
    return this.transition(this.#state.markReady(), "mark-ready", actorId, eventId);
  }

  private transition(nextState: OrderState, action: OrderAction, actorId: string, eventId: number, reason?: string): StateChangeEvent {
    const event: StateChangeEvent = Object.freeze({
      eventId: requireId(eventId, "Event ID"),
      orderId: this.id,
      actorId: requireStringId(actorId, "Actor ID"),
      action,
      from: this.status,
      to: nextState.status,
      occurredAt: new Date(),
      ...(reason === undefined ? {} : { reason }),
    });
    this.#state = nextState;
    this.#events.push(event);
    return this.copyEvent(event);
  }

  private copyEvent(event: StateChangeEvent): StateChangeEvent {
    return Object.freeze({ ...event, occurredAt: new Date(event.occurredAt) });
  }
}
