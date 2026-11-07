import { CarryingState } from "./CarryingState.ts";
import { CourierState } from "./CourierState.ts";
import { IdleState } from "./IdleState.ts";
import { OfflineState } from "./OfflineState.ts";

export class AssignedState extends CourierState {
  readonly status = "ASSIGNED" as const;

  override goOffDuty(): CourierState {
    return new OfflineState();
  }

  override pickUp(): CourierState {
    return new CarryingState();
  }

  override unassign(): CourierState {
    return new IdleState();
  }
}
