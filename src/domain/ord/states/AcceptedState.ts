import { OrderState } from "./OrderState.ts";
import { PreparingState } from "./PreparingState.ts";

export class AcceptedState extends OrderState {
  readonly status = "Accepted" as const;

  override startPreparing(): OrderState {
    return new PreparingState();
  }
}
