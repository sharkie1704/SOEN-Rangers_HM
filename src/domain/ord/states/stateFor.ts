import type { OrderStatus } from "../StateChangeEvent.ts";
import type { OrderState } from "./OrderState.ts";
import { PlacedState } from "./PlacedState.ts";
import { AcceptedState } from "./AcceptedState.ts";
import { PreparingState } from "./PreparingState.ts";
import { ReadyState } from "./ReadyState.ts";
import { RejectedState } from "./RejectedState.ts";
import { CancelledState } from "./CancelledState.ts";

export function stateFor(status: OrderStatus): OrderState {
  switch (status) {
    case "Placed": return new PlacedState();
    case "Accepted": return new AcceptedState();
    case "Preparing": return new PreparingState();
    case "Ready": return new ReadyState();
    case "Rejected": return new RejectedState();
    case "Cancelled": return new CancelledState();
  }
}
