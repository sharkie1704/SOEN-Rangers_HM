import { Order } from "../../domain/ord/Order.ts";
import { OrderError, requireId } from "../../domain/ord/OrderError.ts";
import type { StateChangeEvent } from "../../domain/ord/StateChangeEvent.ts";
import type { OrderActor } from "./OrderActor.ts";
import type { OrderRepository } from "./OrderRepository.ts";
import { toOrderDTO, type OrderDTO } from "./OrderDTO.ts";
import type { PlaceOrderDTO } from "./PlaceOrderDTO.ts";
import type { OrderTransitionDTO } from "./OrderTransitionDTO.ts";

export class OrderService {
  private readonly repository: OrderRepository;

  constructor(repository: OrderRepository) {
    this.repository = repository;
  }

  place(actor: OrderActor | null, input: PlaceOrderDTO): OrderDTO {
    const customer = this.requireActor(actor);
    if (customer.role !== "customer") {
      throw new OrderError("FORBIDDEN", "Only customers can place orders.");
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new OrderError("INVALID_INPUT", "An order must contain at least one item.");
    }
    const order = new Order({
      id: this.repository.nextOrderId(),
      restaurantId: input.restaurantId,
      customerId: customer.userId,
      lines: input.lines,
    });
    this.repository.add(order);
    return toOrderDTO(order);
  }

  get(actor: OrderActor | null, orderId: number): OrderDTO {
    const authenticated = this.requireActor(actor);
    const order = this.findOrder(orderId);
    if (authenticated.role === "restaurant") {
      this.requireRestaurantActor(authenticated, order.restaurantId);
    } else if (authenticated.userId !== order.customerId) {
      throw new OrderError("FORBIDDEN", "Customers can only view their own orders.");
    }
    return toOrderDTO(order);
  }

  incoming(actor: OrderActor | null, restaurantId: number): readonly OrderDTO[] {
    this.requireRestaurantActor(actor, restaurantId);
    return this.repository.findByRestaurant(restaurantId)
      .filter((order) => order.status === "Placed")
      .map(toOrderDTO);
  }

  queue(actor: OrderActor | null, restaurantId: number): readonly OrderDTO[] {
    this.requireRestaurantActor(actor, restaurantId);
    return this.repository.getPreparationQueue(restaurantId).orders.map(toOrderDTO);
  }

  accept(actor: OrderActor | null, orderId: number): OrderTransitionDTO {
    const { order, restaurantActor } = this.restaurantOrder(actor, orderId);
    const event = this.repository.getPreparationQueue(order.restaurantId).accept(order, restaurantActor.userId, this.repository.nextEventId());
    return this.result(order, event);
  }

  reject(actor: OrderActor | null, orderId: number, reason: string): OrderTransitionDTO {
    const { order, restaurantActor } = this.restaurantOrder(actor, orderId);
    return this.result(order, order.reject(restaurantActor.userId, reason, this.repository.nextEventId()));
  }

  cancel(actor: OrderActor | null, orderId: number): OrderTransitionDTO {
    const customer = this.requireActor(actor);
    if (customer.role !== "customer") {
      throw new OrderError("FORBIDDEN", "Only customers can cancel their orders.");
    }
    const order = this.findOrder(orderId);
    if (order.customerId !== customer.userId) {
      throw new OrderError("FORBIDDEN", "Customers can only cancel their own orders.");
    }
    return this.result(order, order.cancel(customer.userId, this.repository.nextEventId()));
  }

  startPreparing(actor: OrderActor | null, orderId: number): OrderTransitionDTO {
    const { order, restaurantActor } = this.restaurantOrder(actor, orderId);
    const event = this.repository.getPreparationQueue(order.restaurantId).startPreparing(order, restaurantActor.userId, this.repository.nextEventId());
    return this.result(order, event);
  }

  markReady(actor: OrderActor | null, orderId: number): OrderTransitionDTO {
    const { order, restaurantActor } = this.restaurantOrder(actor, orderId);
    const event = this.repository.getPreparationQueue(order.restaurantId).markReady(order, restaurantActor.userId, this.repository.nextEventId());
    return this.result(order, event);
  }

  private findOrder(orderId: number): Order {
    const order = this.repository.findById(requireId(orderId, "Order ID"));
    if (!order) {
      throw new OrderError("NOT_FOUND", "Order was not found.");
    }
    return order;
  }

  private requireActor(actor: OrderActor | null): OrderActor {
    if (!actor || !Number.isSafeInteger(actor.userId) || actor.userId <= 0
      || (actor.role !== "customer" && actor.role !== "restaurant")) {
      throw new OrderError("FORBIDDEN", "An authenticated customer or restaurant account is required.");
    }
    if (actor.role === "restaurant" && (!Number.isSafeInteger(actor.restaurantId) || actor.restaurantId <= 0)) {
      throw new OrderError("FORBIDDEN", "A valid restaurant ID is required for restaurant accounts.");
    }
    return actor;
  }

  private requireRestaurantActor(actor: OrderActor | null, restaurantId: number): Extract<OrderActor, { role: "restaurant" }> {
    const authenticated = this.requireActor(actor);
    requireId(restaurantId, "Restaurant ID");
    if (authenticated.role !== "restaurant" || authenticated.restaurantId !== restaurantId) {
      throw new OrderError("FORBIDDEN", "Restaurant accounts can only manage orders for their own restaurant.");
    }
    return authenticated;
  }

  private restaurantOrder(actor: OrderActor | null, orderId: number) {
    this.requireActor(actor);
    const order = this.findOrder(orderId);
    return { order, restaurantActor: this.requireRestaurantActor(actor, order.restaurantId) };
  }

  private result(order: Order, event: StateChangeEvent): OrderTransitionDTO {
    return Object.freeze({ order: toOrderDTO(order), eventId: event.eventId, event });
  }
}
