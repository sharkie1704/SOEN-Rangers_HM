import { CourierError } from "../CourierError.ts";
import { CourierState } from "./CourierState.ts";
import { IdleState } from "./IdleState.ts";

export class CarryingState extends CourierState {
  readonly status = "CARRYING" as const;

  override goOffDuty(): CourierState {
    throw new CourierError("INVALID_TRANSITION", "Cannot go offline while carrying an order.");
  }

  override completeDelivery(): CourierState {
    return new IdleState();
  }
}
