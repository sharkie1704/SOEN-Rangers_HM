import type { OrderStatus } from "../StateChangeEvent.ts";
import type { OrderState } from "./OrderState.ts";
import { PlacedState } from "./PlacedState.ts";
import { AcceptedState } from "./AcceptedState.ts";
import { PreparingState } from "./PreparingState.ts";
import { ReadyState } from "./ReadyState.ts";
import { PickedUpState } from "./PickedUpState.ts";
import { DeliveredState } from "./DeliveredState.ts";
import { RefundedState } from "./RefundedState.ts";
import { RejectedState } from "./RejectedState.ts";
import { CancelledState } from "./CancelledState.ts";

export function stateFor(status: OrderStatus): OrderState {
  switch (status) {
    case "Placed": return new PlacedState();
    case "Accepted": return new AcceptedState();
    case "Preparing": return new PreparingState();
    case "Ready": return new ReadyState();
    case "PickedUp": return new PickedUpState();
    case "Delivered": return new DeliveredState();
    case "Refunded": return new RefundedState();
    case "Rejected": return new RejectedState();
    case "Cancelled": return new CancelledState();
  }
}
