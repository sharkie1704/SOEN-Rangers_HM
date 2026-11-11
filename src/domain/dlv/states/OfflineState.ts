import { AssignedState } from "./AssignedState.ts";
import { CourierState } from "./CourierState.ts";
import { IdleState } from "./IdleState.ts";

export class OfflineState extends CourierState {
  readonly status = "OFFLINE" as const;

  override goOnDuty(): CourierState {
    return new IdleState();
  }

  override resumeDelivery(): CourierState {
    return new AssignedState();
  }
}
