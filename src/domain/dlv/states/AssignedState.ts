import { CourierError } from "../CourierError.ts";
import { CarryingState } from "./CarryingState.ts";
import { CourierState } from "./CourierState.ts";
import { IdleState } from "./IdleState.ts";

export class AssignedState extends CourierState {
  readonly status = "ASSIGNED" as const;

  // There is no reassignment flow, so leaving now would strand the order
  override goOffDuty(): CourierState {
    throw new CourierError("INVALID_TRANSITION", "Cannot go offline while assigned to an order.");
  }

  override pickUp(): CourierState {
    return new CarryingState();
  }

  override unassign(): CourierState {
    return new IdleState();
  }
}
