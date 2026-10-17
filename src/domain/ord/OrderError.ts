export type OrderErrorCode =
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "NOT_QUEUE_FRONT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT";

export class OrderError extends Error {
  readonly code: OrderErrorCode;

  constructor(code: OrderErrorCode, message: string) {
    super(message);
    this.name = "OrderError";
    this.code = code;
  }
}

export function requireText(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OrderError("INVALID_INPUT", `${field} is required.`);
  }
  return value.trim();
}

export function requireId(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new OrderError("INVALID_INPUT", `${field} must be a positive safe integer.`);
  }
  return value;
}
