import { OrderError, requireId, requireText } from "./OrderError.ts";
import { OrderLine } from "./OrderLine.ts";
import type { CreateOrderDTO } from "./CreateOrderDTO.ts";
import type { OrderAction, OrderStatus, StateChangeEvent } from "./StateChangeEvent.ts";
import { OrderState } from "./states/OrderState.ts";
import { PlacedState } from "./states/PlacedState.ts";

export class Order {
  readonly id: number;
  readonly restaurantId: number;
  readonly customerId: number;
  readonly lines: readonly OrderLine[];
  readonly #placedAt: Date;
  #state: OrderState = new PlacedState();
  #events: StateChangeEvent[] = [];

  constructor(input: CreateOrderDTO) {
    this.id = requireId(input.id, "Order ID");
    this.restaurantId = requireId(input.restaurantId, "Restaurant ID");
    this.customerId = requireId(input.customerId, "Customer ID");
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new OrderError("INVALID_INPUT", "An order must contain at least one item.");
    }
    this.lines = Object.freeze(input.lines.map((line) => new OrderLine(line)));
    if (!Number.isSafeInteger(this.totalCents)) {
      throw new OrderError("INVALID_INPUT", "Order total exceeds the supported amount.");
    }
    this.#placedAt = new Date();
    Object.freeze(this);
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

  accept(actorId: number, eventId: number): StateChangeEvent {
    return this.transition(this.#state.accept(), "accept", actorId, eventId);
  }

  reject(actorId: number, reason: string, eventId: number): StateChangeEvent {
    return this.transition(this.#state.reject(), "reject", actorId, eventId, requireText(reason, "Rejection reason"));
  }

  cancel(actorId: number, eventId: number): StateChangeEvent {
    return this.transition(this.#state.cancel(), "cancel", actorId, eventId);
  }

  startPreparing(actorId: number, eventId: number): StateChangeEvent {
    return this.transition(this.#state.startPreparing(), "start-preparing", actorId, eventId);
  }

  markReady(actorId: number, eventId: number): StateChangeEvent {
    return this.transition(this.#state.markReady(), "mark-ready", actorId, eventId);
  }

  private transition(nextState: OrderState, action: OrderAction, actorId: number, eventId: number, reason?: string): StateChangeEvent {
    const event: StateChangeEvent = Object.freeze({
      eventId: requireId(eventId, "Event ID"),
      orderId: this.id,
      actorId: requireId(actorId, "Actor ID"),
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
