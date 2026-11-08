import { OrderError } from "../ord/OrderError.ts";
import type { Order } from "../ord/Order.ts";
import type { OrderLineDTO } from "../ord/OrderLineDTO.ts";
import type { StateChangeEvent } from "../ord/StateChangeEvent.ts";
import type { FareBreakdown } from "./FareBreakdown.ts";

export interface OrderSummary {
  readonly orderId: number;
  readonly customerId: string;
  readonly restaurantId: string;
  readonly restaurantName: string;
  readonly lines: readonly Readonly<OrderLineDTO>[];
  readonly fare: FareBreakdown;
  readonly placedAt: Date;
  readonly deliveredAt: Date;
  readonly generatedAt: Date;
}

export function createOrderSummary(
  order: Order,
  deliveryEvent: StateChangeEvent,
  generatedAt = new Date(),
): OrderSummary {
  if (
    order.status !== "Delivered"
    || deliveryEvent.action !== "deliver"
    || deliveryEvent.to !== "Delivered"
    || deliveryEvent.orderId !== order.id
  ) {
    throw new OrderError("CONFLICT", "An order summary can only be created from its delivery event.");
  }
  if (!order.fare) {
    throw new OrderError("CONFLICT", "The order has no saved fare breakdown and cannot be summarized.");
  }

  return Object.freeze({
    orderId: order.id,
    customerId: order.customerId,
    restaurantId: order.restaurantId,
    restaurantName: order.restaurantName,
    lines: Object.freeze(order.lines.map((line) => Object.freeze({
      menuItemId: line.menuItemId,
      name: line.name,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
    }))),
    fare: Object.freeze({ ...order.fare }),
    placedAt: order.placedAt,
    deliveredAt: new Date(deliveryEvent.occurredAt),
    generatedAt: new Date(generatedAt),
  });
}
