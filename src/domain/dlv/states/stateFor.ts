import { AssignedState } from "./AssignedState.ts";
import { CarryingState } from "./CarryingState.ts";
import type { CourierState, CourierStatus } from "./CourierState.ts";
import { IdleState } from "./IdleState.ts";
import { OfflineState } from "./OfflineState.ts";

export function stateFor(status: CourierStatus): CourierState {
  switch (status) {
    case "OFFLINE": return new OfflineState();
    case "IDLE": return new IdleState();
    case "ASSIGNED": return new AssignedState();
    case "CARRYING": return new CarryingState();
  }
}
