import type { OrderActor } from "./OrderActor.ts";
import { OrderService } from "./OrderService.ts";
import type { PlaceOrderDTO } from "./PlaceOrderDTO.ts";
import type { OrderDTO } from "./OrderDTO.ts";
import type { OrderTransitionDTO } from "./OrderTransitionDTO.ts";

export class OrderController {
  private readonly service: OrderService;

  constructor(service: OrderService) {
    this.service = service;
  }

  place(actor: OrderActor | null, input: PlaceOrderDTO): OrderDTO {
    return this.service.place(actor, input);
  }

  get(actor: OrderActor | null, orderId: number): OrderDTO {
    return this.service.get(actor, orderId);
  }

  accept(actor: OrderActor | null, orderId: number): OrderTransitionDTO {
    return this.service.accept(actor, orderId);
  }

  reject(actor: OrderActor | null, orderId: number, reason: string): OrderTransitionDTO {
    return this.service.reject(actor, orderId, reason);
  }

  cancel(actor: OrderActor | null, orderId: number): OrderTransitionDTO {
    return this.service.cancel(actor, orderId);
  }

  startPreparing(actor: OrderActor | null, orderId: number): OrderTransitionDTO {
    return this.service.startPreparing(actor, orderId);
  }

  markReady(actor: OrderActor | null, orderId: number): OrderTransitionDTO {
    return this.service.markReady(actor, orderId);
  }
}
