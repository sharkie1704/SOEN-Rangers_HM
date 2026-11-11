import { CourierError } from "../CourierError.ts";

export type CourierStatus = "OFFLINE" | "IDLE" | "ASSIGNED" | "CARRYING";

// Every transition is refused unless a state allows it
export abstract class CourierState {
  abstract readonly status: CourierStatus;

  goOnDuty(): CourierState {
    return this.disallow("go on duty");
  }

  goOffDuty(): CourierState {
    return this.disallow("go off duty");
  }

  resumeDelivery(): CourierState {
    return this.disallow("resume an accepted delivery");
  }

  assign(): CourierState {
    return this.disallow("be assigned an order");
  }

  unassign(): CourierState {
    return this.disallow("be unassigned from an order");
  }

  pickUp(): CourierState {
    return this.disallow("pick up an order");
  }

  completeDelivery(): CourierState {
    return this.disallow("complete a delivery");
  }

  private disallow(action: string): never {
    throw new CourierError("INVALID_TRANSITION", `A courier cannot ${action} while ${this.status}.`);
  }
}
