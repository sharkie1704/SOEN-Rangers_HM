import type { Order } from "../../domain/ord/Order.ts";
import type { OrderLineDTO } from "../../domain/ord/OrderLineDTO.ts";
import type { OrderStatus, StateChangeEvent } from "../../domain/ord/StateChangeEvent.ts";

export interface OrderDTO {
  readonly id: number;
  readonly restaurantId: number;
  readonly customerId: number;
  readonly status: OrderStatus;
  readonly lines: readonly Readonly<OrderLineDTO>[];
  readonly totalCents: number;
  readonly placedAt: Date;
  readonly rejectionReason?: string;
  readonly events: readonly StateChangeEvent[];
}

export function toOrderDTO(order: Order): OrderDTO {
  return Object.freeze({
    id: order.id,
    restaurantId: order.restaurantId,
    customerId: order.customerId,
    status: order.status,
    lines: Object.freeze(order.lines.map((line) => Object.freeze({
      menuItemId: line.menuItemId,
      name: line.name,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
    }))),
    totalCents: order.totalCents,
    placedAt: order.placedAt,
    rejectionReason: order.rejectionReason,
    events: order.events,
  });
}
