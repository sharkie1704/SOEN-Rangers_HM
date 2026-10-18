import { OrderState } from "./OrderState.ts";
import { ReadyState } from "./ReadyState.ts";

export class PreparingState extends OrderState {
  readonly status = "Preparing" as const;

  override markReady(): OrderState {
    return new ReadyState();
  }
}
