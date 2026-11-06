export type AssignmentErrorCode =
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT";

export class AssignmentError extends Error {
  readonly code: AssignmentErrorCode;

  constructor(code: AssignmentErrorCode, message: string) {
    super(message);
    this.name = "AssignmentError";
    this.code = code;
  }
}
