import { AssignedState } from "./AssignedState.ts";
import { CourierState } from "./CourierState.ts";
import { OfflineState } from "./OfflineState.ts";

export class IdleState extends CourierState {
  readonly status = "IDLE" as const;

  override goOffDuty(): CourierState {
    return new OfflineState();
  }

  override assign(): CourierState {
    return new AssignedState();
  }
}
