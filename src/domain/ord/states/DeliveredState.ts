import { OrderState } from "./OrderState.ts";
import { RefundedState } from "./RefundedState.ts";

export class DeliveredState extends OrderState {
  readonly status = "Delivered" as const;

  override refund(): OrderState {
    return new RefundedState();
  }
}
