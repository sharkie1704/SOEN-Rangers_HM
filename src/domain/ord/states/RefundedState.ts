import { OrderState } from "./OrderState.ts";

export class RefundedState extends OrderState {
  readonly status = "Refunded" as const;
}
