import type { OrderLineDTO } from "./OrderLineDTO.ts";
import type { FareBreakdown } from "../prc/FareBreakdown.ts";

export interface CreateOrderDTO {
  id: number;
  restaurantId: string;
  customerId: string;
  lines: readonly OrderLineDTO[];
  restaurantName?: string;
  fare?: FareBreakdown | null;
}
