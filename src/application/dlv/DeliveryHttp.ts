import type { Request, Response } from "express";
import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import { CourierError } from "../../domain/dlv/CourierError.ts";
import { OrderError } from "../../domain/ord/OrderError.ts";
import type { AuthenticatedUser } from "../../domain/reg/Session.ts";
import type { AssignmentActor } from "./AssignmentService.ts";

const statusByCode: Record<string, number> = {
  INVALID_INPUT: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_TRANSITION: 409,
  NOT_QUEUE_FRONT: 409,
};

export function toActor(user: AuthenticatedUser | undefined): AssignmentActor | null {
  return user ? { userId: user.id, role: user.role } : null;
}

export function orderIdFrom(req: Request): number {
  const orderId = Number(req.params.orderId);
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    throw new AssignmentError("INVALID_INPUT", "Order ID must be a positive integer.");
  }
  return orderId;
}

export async function respond(res: Response, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof AssignmentError || error instanceof CourierError || error instanceof OrderError) {
      res.status(statusByCode[error.code] ?? 400).json({ error: error.message, code: error.code });
    } else {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
