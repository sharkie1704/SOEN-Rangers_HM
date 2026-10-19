import { OrderError } from "./OrderError.ts";

export type RestaurantStatus = "OPEN" | "PAUSED" | "CLOSED";

export class Restaurant {
  readonly id: string;
  private _status: RestaurantStatus;

  constructor(id: string, status: RestaurantStatus) {
    this.id = id;
    this._status = status;
  }

  get status() { return this._status; }

  pause(): RestaurantStatus {
    return this.moveTo("PAUSED", "OPEN");
  }

  reopen(): RestaurantStatus {
    return this.moveTo("OPEN", "PAUSED");
  }

  private moveTo(next: RestaurantStatus, requiredFrom: RestaurantStatus): RestaurantStatus {
    if (this._status !== requiredFrom) {
      throw new OrderError("CONFLICT", `Restaurant is ${this._status.toLowerCase()}, so it cannot become ${next.toLowerCase()}.`);
    }
    const previous = this._status;
    this._status = next;
    return previous;
  }
}