import { Order } from "../../domain/ord/Order.ts";
import { OrderError, requireId, requireStringId } from "../../domain/ord/OrderError.ts";
import { Role } from "../../domain/reg/Role.ts";
import type { OrderLineDTO } from "../../domain/ord/OrderLineDTO.ts";
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

  place(actor: OrderActor | null, input: PlaceOrderDTO): OrderDTO {
    const customer = this.requireActor(actor);
    if (customer.role !== Role.CUSTOMER) {
      throw new OrderError("FORBIDDEN", "Only customers can place orders.");
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new OrderError("INVALID_INPUT", "An order must contain at least one item.");
    }
    const restaurantId = requireStringId(input.restaurantId, "Restaurant ID");
    const restaurant = this.menu.findRestaurant(restaurantId);
    if (!restaurant) {
      throw new OrderError("NOT_FOUND", "Restaurant was not found.");
    }
    if (!restaurant.isOpen) {
      throw new OrderError("CONFLICT", "Restaurant is not accepting orders.");
    }
    const order = new Order({
      id: this.repository.nextOrderId(),
      restaurantId,
      customerId: customer.userId,
      lines: this.priceLines(restaurantId, input.lines),
    });
    this.repository.add(order);
    return toOrderDTO(order);
  }

  get(actor: OrderActor | null, orderId: number): OrderDTO {
    const authenticated = this.requireActor(actor);
    const order = this.findOrder(orderId);
    if (authenticated.role === Role.RESTAURANT) {
      this.requireRestaurantActor(authenticated, order.restaurantId);
    } else if (authenticated.userId !== order.customerId) {
      throw new OrderError("FORBIDDEN", "Customers can only view their own orders.");
    }
    return toOrderDTO(order);
  }

  incoming(actor: OrderActor | null, restaurantId: string): readonly OrderDTO[] {
    this.requireRestaurantActor(actor, restaurantId);
    return this.repository.findByRestaurant(restaurantId)
      .filter((order) => order.status === "Placed")
      .map(toOrderDTO);
  }

  queue(actor: OrderActor | null, restaurantId: string): readonly OrderDTO[] {
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
    if (customer.role !== Role.CUSTOMER) {
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

  // Name and price always come from the menu, never from the client
  private priceLines(restaurantId: string, lines: readonly PlaceOrderLineDTO[]): OrderLineDTO[] {
    const seen = new Set<number>();
    return lines.map((line) => {
      const menuItemId = requireId(line.menuItemId, "Menu item ID");
      if (seen.has(menuItemId)) {
        throw new OrderError("INVALID_INPUT", `Menu item ${menuItemId} is listed more than once.`);
      }
      seen.add(menuItemId);
      if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0 || line.quantity > MAX_LINE_QUANTITY) {
        throw new OrderError("INVALID_INPUT", `Quantity must be an integer between 1 and ${MAX_LINE_QUANTITY}.`);
      }
      const item = this.menu.findMenuItem(menuItemId);
      if (!item) {
        throw new OrderError("NOT_FOUND", `Menu item ${menuItemId} was not found.`);
      }
      if (item.restaurantId !== restaurantId) {
        throw new OrderError("INVALID_INPUT", `Menu item ${menuItemId} does not belong to this restaurant.`);
      }
      if (!item.available) {
        throw new OrderError("CONFLICT", `${item.name} is sold out.`);
      }
      return { menuItemId, name: item.name, quantity: line.quantity, unitPriceCents: item.unitPriceCents };
    });
  }

  private findOrder(orderId: number): Order {
    const order = this.repository.findById(requireId(orderId, "Order ID"));
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
    if (authenticated.role !== Role.RESTAURANT || authenticated.restaurantId !== restaurantId) {
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
