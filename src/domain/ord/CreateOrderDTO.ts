import type { OrderLineDTO } from "./OrderLineDTO.ts";

export interface CreateOrderDTO {
  id: number;
  restaurantId: number;
  customerId: number;
  lines: readonly OrderLineDTO[];
}
