// Throw ValidationError or DuplicateEmailError when the throw is about what a user submitted
// If invariant of the object is violated, throw a generic Error

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "DuplicateEmailError";
  }
}