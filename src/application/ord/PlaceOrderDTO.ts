import type { OrderLineDTO } from "../../domain/ord/OrderLineDTO.ts";

export interface PlaceOrderDTO {
  restaurantId: number;
  lines: readonly OrderLineDTO[];
}
