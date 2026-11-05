export type CourierErrorCode =
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT";

export class CourierError extends Error {
  readonly code: CourierErrorCode;

  constructor(code: CourierErrorCode, message: string) {
    super(message);
    this.name = "CourierError";
    this.code = code;
  }
}
