import type { CreateOrderDTO } from "./CreateOrderDTO.ts";
import type { OrderStatus, StateChangeEvent } from "./StateChangeEvent.ts";

export interface RestoredOrderDTO extends CreateOrderDTO {
  placedAt: Date;
  status: OrderStatus;
  events: readonly StateChangeEvent[];
}
