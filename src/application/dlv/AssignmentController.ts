import type { Request, Response } from "express";
import type { Assignment } from "../../domain/dlv/Assignment.ts";
import { AssignmentError, type AssignmentErrorCode } from "../../domain/dlv/AssignmentError.ts";
import { CourierError } from "../../domain/dlv/CourierError.ts";
import type { AuthenticatedUser } from "../../domain/reg/Session.ts";
import type { AssignmentActor, AssignmentService } from "./AssignmentService.ts";

const statusByCode: Record<AssignmentErrorCode, number> = {
  INVALID_INPUT: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_TRANSITION: 409,
};

function toActor(user: AuthenticatedUser | undefined): AssignmentActor | null {
  return user ? { userId: user.id, role: user.role } : null;
}

function toDTO(assignment: Assignment) {
  return { orderId: assignment.orderId, courierId: assignment.courierId, status: assignment.status };
}

function orderIdFrom(req: Request): number {
  const orderId = Number(req.params.orderId);
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    throw new AssignmentError("INVALID_INPUT", "Order ID must be a positive integer.");
  }
  return orderId;
}

export class AssignmentController {
  constructor(private readonly service: AssignmentService) {}

  accept = (req: Request, res: Response) => this.respond(res, async () => {
    const { assignment, eventId } = await this.service.accept(toActor(req.user), orderIdFrom(req));
    res.json({ assignment: toDTO(assignment), eventId });
  });

  decline = (req: Request, res: Response) => this.respond(res, async () => {
    const { assignment, eventId } = await this.service.decline(toActor(req.user), orderIdFrom(req));
    res.json({ assignment: toDTO(assignment), eventId });
  });

  private async respond(res: Response, action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      if (error instanceof AssignmentError || error instanceof CourierError) {
        res.status(statusByCode[error.code]).json({ error: error.message, code: error.code });
      } else {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
}
