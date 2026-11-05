import { DeliveredState } from "./DeliveredState.ts";
import { OrderState } from "./OrderState.ts";

export class PickedUpState extends OrderState {
  readonly status = "PickedUp" as const;

  override deliver(): OrderState {
    return new DeliveredState();
  }
}
