import { OrderState } from "./OrderState.ts";

export class DeliveredState extends OrderState {
  readonly status = "Delivered" as const;
}
