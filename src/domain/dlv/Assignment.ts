import { AssignmentError } from "./AssignmentError.ts";

export type AssignmentStatus = "Offered" | "Accepted" | "Declined";

export class Assignment {
  readonly orderId: number;
  readonly courierId: string;
  #status: AssignmentStatus;

  constructor(orderId: number, courierId: string, status: AssignmentStatus = "Offered") {
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      throw new AssignmentError("INVALID_INPUT", "Order ID must be a positive integer.");
    }
    if (typeof courierId !== "string" || courierId.trim().length === 0) {
      throw new AssignmentError("INVALID_INPUT", "Courier ID is required.");
    }
    this.orderId = orderId;
    this.courierId = courierId;
    this.#status = status;
  }

  get status(): AssignmentStatus {
    return this.#status;
  }

  accept(): void {
    if (this.#status !== "Offered") {
      throw new AssignmentError("INVALID_TRANSITION", "Only a pending offer can be accepted.");
    }
    this.#status = "Accepted";
  }

  decline(): void {
    if (this.#status !== "Offered") {
      throw new AssignmentError("INVALID_TRANSITION", "Only a pending offer can be declined.");
    }
    this.#status = "Declined";
  }
}
