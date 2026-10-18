import type { Response } from "express";
import { DuplicateEmailError, ValidationError } from "../../domain/reg/Errors";

export function sendRegistrationError(e: unknown, res: Response): void {
  if (e instanceof DuplicateEmailError) {
    res.status(409).json({ error: e.message });
    return;
  }
  if (e instanceof ValidationError) {
    res.status(400).json({ error: e.message });
    return;
  }
  console.error(e);
  res.status(500).json({ error: "Internal server error" });
}