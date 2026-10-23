import { hasPermission } from "../../domain/reg/permissions";
import { Order } from "../../domain/ord/Order.ts";
import { OrderError, requireId, requireStringId } from "../../domain/ord/OrderError.ts";
import { Role } from "../../domain/reg/Role.ts";
import type { OrderLineDTO } from "../../domain/ord/OrderLineDTO.ts";
import { SYSTEM_ACTOR_ID, type PreparationQueue } from "../../domain/ord/PreparationQueue.ts";
import type { StateChangeEvent } from "../../domain/ord/StateChangeEvent.ts";
import type { MenuCatalog } from "./MenuCatalog.ts";
import type { OrderActor } from "./OrderActor.ts";
import type { OrderRepository } from "./OrderRepository.ts";
import { toOrderDTO, type OrderDTO } from "./OrderDTO.ts";
import type { PlaceOrderDTO, PlaceOrderLineDTO } from "./PlaceOrderDTO.ts";
import type { OrderTransitionDTO } from "./OrderTransitionDTO.ts";

export const MAX_LINE_QUANTITY = 50;

export class OrderService {
  private readonly repository: OrderRepository;
  private readonly menu: MenuCatalog;

  constructor(repository: OrderRepository, menu: MenuCatalog) {
    this.repository = repository;
    this.menu = menu;
  }

  async place(actor: OrderActor | null, input: PlaceOrderDTO): Promise<OrderDTO> {
    const customer = this.requireActor(actor);
    if (!hasPermission({ name: "placeOrder" }, { ...customer, id: customer.userId })) {
      throw new OrderError("FORBIDDEN", "Only customers can place orders.");
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new OrderError("INVALID_INPUT", "An order must contain at least one item.");
    }
    const restaurantId = requireStringId(input.restaurantId, "Restaurant ID");
    const restaurant = await this.menu.findRestaurant(restaurantId);
    if (!restaurant) {
      throw new OrderError("NOT_FOUND", "Restaurant was not found.");
    }
    if (!restaurant.isOpen) {
      throw new OrderError("CONFLICT", "Restaurant is not accepting orders.");
    }
    const lines = await this.priceLines(restaurantId, input.lines);
    const placedEventId = await this.repository.nextEventId();
    const order = new Order({
      id: await this.repository.nextOrderId(),
      restaurantId,
      customerId: customer.userId,
      lines,
    }, new Date(), { actorId: customer.userId, eventId: placedEventId });
    await this.repository.add(order);
    this.logEvent(order.events[0]);
    return toOrderDTO(order);
  }

  async get(actor: OrderActor | null, orderId: number): Promise<OrderDTO> {
    const authenticated = this.requireActor(actor);
    const order = await this.findOrder(orderId);
    if (!hasPermission({ name: "viewOrder", customerId: order.customerId, restaurantId: order.restaurantId },
      { ...authenticated, id: authenticated.userId })) {
      throw new OrderError("FORBIDDEN", "You can only view your own orders or orders for your restaurant.");
    }
    return toOrderDTO(order);
  }

  async customerOrders(actor: OrderActor | null): Promise<readonly OrderDTO[]> {
    const customer = this.requireActor(actor);
    if (!hasPermission({ name: "customerOrders" }, { ...customer, id: customer.userId })) {
      throw new OrderError("FORBIDDEN", "Only customers can view customer order history.");
    }
    return (await this.repository.findByCustomer(customer.userId)).map(toOrderDTO);
  }

  async incoming(actor: OrderActor | null, restaurantId: string): Promise<readonly OrderDTO[]> {
    this.requireRestaurantActor(actor, restaurantId);
    return (await this.repository.findByRestaurant(restaurantId))
      .filter((order) => order.status === "Placed")
      .map(toOrderDTO);
  }

  async queue(actor: OrderActor | null, restaurantId: string): Promise<readonly OrderDTO[]> {
    this.requireRestaurantActor(actor, restaurantId);
    return (await this.repository.getPreparationQueue(restaurantId)).orders.map(toOrderDTO);
  }

  // Works while the restaurant is paused, so orders placed before the pause can still be handled
  async accept(actor: OrderActor | null, orderId: number): Promise<OrderTransitionDTO> {
    const { order, restaurantActor } = await this.restaurantOrder(actor, orderId);
    return this.repository.withQueueLock(order.restaurantId, async (orders) => {
      const queue = await orders.getPreparationQueue(order.restaurantId);
      const event = queue.accept(order, restaurantActor.userId, await orders.nextEventId());
      const started = await this.startFront(queue, orders);
      await this.saveAll(orders, [order, started]);
      this.logEvent(event);
      const startEvent = started?.events.at(-1);
      if (startEvent) this.logEvent(startEvent);
      return toTransition(order, event);
    });
  }

  async reject(actor: OrderActor | null, orderId: number, reason: string): Promise<OrderTransitionDTO> {
    const { order, restaurantActor } = await this.restaurantOrder(actor, orderId);
    return this.save(order, order.reject(restaurantActor.userId, reason, await this.repository.nextEventId()));
  }

  async cancel(actor: OrderActor | null, orderId: number): Promise<OrderTransitionDTO> {
    const customer = this.requireActor(actor);
    if (!hasPermission({ name: "cancelOrder", customerId: customer.userId }, { ...customer, id: customer.userId })) {
      throw new OrderError("FORBIDDEN", "Only customers can cancel their orders.");
    }
    const order = await this.findOrder(orderId);
    if (!hasPermission({ name: "cancelOrder", customerId: order.customerId }, { ...customer, id: customer.userId })) {
      throw new OrderError("FORBIDDEN", "Customers can only cancel their own orders.");
    }
    return this.save(order, order.cancel(customer.userId, await this.repository.nextEventId()));
  }

  async markReady(actor: OrderActor | null, orderId: number): Promise<OrderTransitionDTO> {
    const { order, restaurantActor } = await this.restaurantOrder(actor, orderId);
    return this.repository.withQueueLock(order.restaurantId, async (orders) => {
      const queue = await orders.getPreparationQueue(order.restaurantId);
      const queued = this.queuedOrder(queue, order);
      const event = queue.markReady(queued, restaurantActor.userId, await orders.nextEventId());
      const started = await this.startFront(queue, orders);
      await this.saveAll(orders, [queued, started]);
      this.logEvent(event);
      const startEvent = started?.events.at(-1);
      if (startEvent) this.logEvent(startEvent);
      return toTransition(queued, event);
    });
  }

  // The front of the queue is always being prepared, so the system starts it as soon as it gets there
  private async startFront(queue: PreparationQueue, orders: OrderRepository): Promise<Order | undefined> {
    const front = queue.waitingToStart;
    if (front) {
      queue.startPreparing(front, SYSTEM_ACTOR_ID, await orders.nextEventId());
    }
    return front;
  }

  private async saveAll(orders: OrderRepository, changed: readonly (Order | undefined)[]): Promise<void> {
    for (const order of new Set(changed)) {
      if (order) await orders.save(order);
    }
  }

  // Name and price always come from the menu, never from the client
  private async priceLines(restaurantId: string, lines: readonly PlaceOrderLineDTO[]): Promise<OrderLineDTO[]> {
    const seen = new Set<number>();
    const priced: OrderLineDTO[] = [];
    for (const line of lines) {
      if (!line || typeof line !== "object" || Array.isArray(line)) {
        throw new OrderError("INVALID_INPUT", "Each order line must be an item with a quantity.");
      }
      const menuItemId = requireId(line.menuItemId, "Menu item ID");
      if (seen.has(menuItemId)) {
        throw new OrderError("INVALID_INPUT", `Menu item ${menuItemId} is listed more than once.`);
      }
      seen.add(menuItemId);
      if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0 || line.quantity > MAX_LINE_QUANTITY) {
        throw new OrderError("INVALID_INPUT", `Quantity must be an integer between 1 and ${MAX_LINE_QUANTITY}.`);
      }
      const item = await this.menu.findMenuItem(menuItemId);
      if (!item) {
        throw new OrderError("NOT_FOUND", `Menu item ${menuItemId} was not found.`);
      }
      if (item.restaurantId !== restaurantId) {
        throw new OrderError("INVALID_INPUT", `Menu item ${menuItemId} does not belong to this restaurant.`);
      }
      if (!item.available) {
        throw new OrderError("CONFLICT", `${item.name} is sold out.`);
      }
      priced.push({ menuItemId, name: item.name, quantity: line.quantity, unitPriceCents: item.unitPriceCents });
    }
    return priced;
  }

  private async findOrder(orderId: number): Promise<Order> {
    const order = await this.repository.findById(requireId(orderId, "Order ID"));
    if (!order) {
      throw new OrderError("NOT_FOUND", "Order was not found.");
    }
    return order;
  }

  private requireActor(actor: OrderActor | null): OrderActor {
    if (!actor || typeof actor.userId !== "string" || actor.userId.trim().length === 0
      || (actor.role !== Role.CUSTOMER && actor.role !== Role.RESTAURANT)) {
      throw new OrderError("FORBIDDEN", "An authenticated customer or restaurant account is required.");
    }
    if (actor.role === Role.RESTAURANT && (typeof actor.restaurantId !== "string" || actor.restaurantId.trim().length === 0)) {
      throw new OrderError("FORBIDDEN", "A valid restaurant ID is required for restaurant accounts.");
    }
    return actor;
  }

  private requireRestaurantActor(actor: OrderActor | null, restaurantId: string): Extract<OrderActor, { role: Role.RESTAURANT }> {
    const authenticated = this.requireActor(actor);
    requireStringId(restaurantId, "Restaurant ID");
    if (!hasPermission({ name: "manageOrders", restaurantId }, { ...authenticated, id: authenticated.userId })) {
      throw new OrderError("FORBIDDEN", "Restaurant accounts can only manage orders for their own restaurant.");
    }
    return authenticated as Extract<OrderActor, { role: Role.RESTAURANT }>;
  }

  private async restaurantOrder(actor: OrderActor | null, orderId: number) {
    this.requireActor(actor);
    const order = await this.findOrder(orderId);
    return { order, restaurantActor: this.requireRestaurantActor(actor, order.restaurantId) };
  }

  // A repository may load the queue's orders as separate instances, so transition the queued one
  private queuedOrder(queue: PreparationQueue, order: Order): Order {
    return queue.find(order.id) ?? order;
  }

  private async save(order: Order, event: StateChangeEvent): Promise<OrderTransitionDTO> {
    await this.repository.save(order);
    this.logEvent(event);
    return toTransition(order, event);
  }

  private logEvent(event: StateChangeEvent): void {
    console.info(`[ORD] eventId=${event.eventId} action=${event.action} orderId=${event.orderId} ${event.from}->${event.to} actorId=${event.actorId}`);
  }
}

function toTransition(order: Order, event: StateChangeEvent): OrderTransitionDTO {
  return Object.freeze({ order: toOrderDTO(order), eventId: event.eventId, event });
}
