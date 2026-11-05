import { CourierError } from "./CourierError.ts";
import type { CourierState, CourierStatus } from "./states/CourierState.ts";
import { stateFor } from "./states/stateFor.ts";

// Courier in reg/ is the account; this is the courier's delivery availability.
// Each transition returns the status it moved from, for the event record.
export class CourierAvailability {
  readonly courierId: string;
  #state: CourierState;

  constructor(courierId: string, status: CourierStatus = "OFFLINE") {
    if (typeof courierId !== "string" || courierId.trim().length === 0) {
      throw new CourierError("INVALID_INPUT", "Courier ID is required.");
    }
    this.courierId = courierId;
    this.#state = stateFor(status);
  }

  get status(): CourierStatus {
    return this.#state.status;
  }

  goOnDuty(): CourierStatus {
    return this.moveTo(this.#state.goOnDuty());
  }

  goOffDuty(): CourierStatus {
    return this.moveTo(this.#state.goOffDuty());
  }

  assign(): CourierStatus {
    return this.moveTo(this.#state.assign());
  }

  unassign(): CourierStatus {
    return this.moveTo(this.#state.unassign());
  }

  pickUp(): CourierStatus {
    return this.moveTo(this.#state.pickUp());
  }

  completeDelivery(): CourierStatus {
    return this.moveTo(this.#state.completeDelivery());
  }

  private moveTo(next: CourierState): CourierStatus {
    const previous = this.status;
    this.#state = next;
    return previous;
  }
}
