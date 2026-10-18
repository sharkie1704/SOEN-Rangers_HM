import type { OrderActor } from "./OrderActor.ts";
import { OrderService } from "./OrderService.ts";
import type { OrderDTO } from "./OrderDTO.ts";

export class RestaurantController {
  private readonly service: OrderService;

  constructor(service: OrderService) {
    this.service = service;
  }

  incomingOrders(actor: OrderActor | null, restaurantId: string): readonly OrderDTO[] {
    return this.service.incoming(actor, restaurantId);
  }

  preparationQueue(actor: OrderActor | null, restaurantId: string): readonly OrderDTO[] {
    return this.service.queue(actor, restaurantId);
  }
}
