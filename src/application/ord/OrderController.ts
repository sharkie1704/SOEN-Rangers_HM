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

  place(actor: OrderActor | null, input: PlaceOrderDTO): Promise<OrderDTO> {
    return this.service.place(actor, input);
  }

  get(actor: OrderActor | null, orderId: number): Promise<OrderDTO> {
    return this.service.get(actor, orderId);
  }

  customerOrders(actor: OrderActor | null): Promise<readonly OrderDTO[]> {
    return this.service.customerOrders(actor);
  }

  incoming(actor: OrderActor | null, restaurantId: string): Promise<readonly OrderDTO[]> {
    return this.service.incoming(actor, restaurantId);
  }

  queue(actor: OrderActor | null, restaurantId: string): Promise<readonly OrderDTO[]> {
    return this.service.queue(actor, restaurantId);
  }

  accept(actor: OrderActor | null, orderId: number): Promise<OrderTransitionDTO> {
    return this.service.accept(actor, orderId);
  }

  reject(actor: OrderActor | null, orderId: number, reason: string): Promise<OrderTransitionDTO> {
    return this.service.reject(actor, orderId, reason);
  }

  cancel(actor: OrderActor | null, orderId: number): Promise<OrderTransitionDTO> {
    return this.service.cancel(actor, orderId);
  }

  markReady(actor: OrderActor | null, orderId: number): Promise<OrderTransitionDTO> {
    return this.service.markReady(actor, orderId);
  }
}
