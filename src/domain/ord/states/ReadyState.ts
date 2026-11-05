import { OrderState } from "./OrderState.ts";
import { PickedUpState } from "./PickedUpState.ts";

export class ReadyState extends OrderState {
  readonly status = "Ready" as const;

  override pickUp(): OrderState {
    return new PickedUpState();
  }
}
