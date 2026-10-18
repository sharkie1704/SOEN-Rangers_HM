import type { OrderLineDTO } from "./OrderLineDTO.ts";

export interface CreateOrderDTO {
  id: number;
  restaurantId: string;
  customerId: string;
  lines: readonly OrderLineDTO[];
}
