import type { OrderLineDTO } from "../../domain/ord/OrderLineDTO.ts";

export interface PlaceOrderDTO {
  restaurantId: string;
  lines: readonly OrderLineDTO[];
}
