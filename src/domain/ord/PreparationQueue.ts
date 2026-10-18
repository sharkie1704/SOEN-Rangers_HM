import { Order } from "./Order.ts";
import { OrderError, requireStringId } from "./OrderError.ts";
import type { StateChangeEvent } from "./StateChangeEvent.ts";

export class PreparationQueue {
  readonly restaurantId: string;
  #orders: Order[] = [];

  constructor(restaurantId: string) {
    this.restaurantId = requireStringId(restaurantId, "Restaurant ID");
    Object.freeze(this);
  }

  // Rebuilds a queue from storage; orders must already be in acceptance order
  static restore(restaurantId: string, orders: readonly Order[]): PreparationQueue {
    const queue = new PreparationQueue(restaurantId);
    for (const order of orders) {
      if (order.restaurantId !== queue.restaurantId) {
        throw new OrderError("INVALID_INPUT", "Order belongs to a different restaurant.");
      }
      if (order.status !== "Accepted" && order.status !== "Preparing") {
        throw new OrderError("INVALID_INPUT", `Order ${order.id} in ${order.status} state cannot be queued.`);
      }
      queue.#orders.push(order);
    }
    return queue;
  }

  get orders(): readonly Order[] {
    return Object.freeze([...this.#orders]);
  }

  get length(): number {
    return this.#orders.length;
  }

  get front(): Order | undefined {
    return this.#orders[0];
  }

  find(orderId: number): Order | undefined {
    return this.#orders.find((order) => order.id === orderId);
  }

  accept(order: Order, actorId: string, eventId: number): StateChangeEvent {
    if (order.restaurantId !== this.restaurantId) {
      throw new OrderError("INVALID_INPUT", "Order belongs to a different restaurant.");
    }
    if (this.#orders.some((queued) => queued.id === order.id)) {
      throw new OrderError("CONFLICT", "Order is already in the preparation queue.");
    }
    const event = order.accept(actorId, eventId);
    this.#orders.push(order);
    return event;
  }

  startPreparing(order: Order, actorId: string, eventId: number): StateChangeEvent {
    this.requireQueued(order);
    return order.startPreparing(actorId, eventId);
  }

  markReady(order: Order, actorId: string, eventId: number): StateChangeEvent {
    this.requireQueued(order);
    if (this.front !== order) {
      throw new OrderError("NOT_QUEUE_FRONT", "Only the front order can be marked Ready.");
    }
    const event = order.markReady(actorId, eventId);
    this.#orders.shift();
    return event;
  }

  private requireQueued(order: Order): void {
    if (!this.#orders.includes(order)) {
      throw new OrderError("INVALID_TRANSITION", "Order is not in this restaurant's preparation queue.");
    }
  }
}
