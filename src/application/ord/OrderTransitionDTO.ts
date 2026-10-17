import type { OrderDTO } from "./OrderDTO.ts";
import type { StateChangeEvent } from "../../domain/ord/StateChangeEvent.ts";

export interface OrderTransitionDTO {
  readonly order: OrderDTO;
  readonly eventId: number;
  readonly event: StateChangeEvent;
}
