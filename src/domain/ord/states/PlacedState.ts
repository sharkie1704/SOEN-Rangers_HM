import { OrderState } from "./OrderState.ts";
import { AcceptedState } from "./AcceptedState.ts";
import { RejectedState } from "./RejectedState.ts";
import { CancelledState } from "./CancelledState.ts";

export class PlacedState extends OrderState {
  readonly status = "Placed" as const;

  override accept(): OrderState {
    return new AcceptedState();
  }

  override reject(): OrderState {
    return new RejectedState();
  }

  override cancel(): OrderState {
    return new CancelledState();
  }
}
