import type { Request, Response } from "express";
import type { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import { CourierError, type CourierErrorCode } from "../../domain/dlv/CourierError.ts";
import type { AuthenticatedUser } from "../../domain/reg/Session.ts";
import type { CourierActor, CourierAvailabilityService } from "./CourierAvailabilityService.ts";

const statusByCode: Record<CourierErrorCode, number> = {
  INVALID_INPUT: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_TRANSITION: 409,
};

function toActor(user: AuthenticatedUser | undefined): CourierActor | null {
  return user ? { userId: user.id, role: user.role } : null;
}

function toDTO(courier: CourierAvailability) {
  return { id: courier.courierId, status: courier.status };
}

export class CourierAvailabilityController {
  constructor(private readonly service: CourierAvailabilityService) {}

  get = (req: Request, res: Response) => this.respond(res, async () => {
    res.json({ courier: toDTO(await this.service.get(toActor(req.user))) });
  });

  // Couriers only choose on or off duty; ASSIGNED and CARRYING come from the delivery flow
  update = (req: Request, res: Response) => this.respond(res, async () => {
    const actor = toActor(req.user);
    const { status } = req.body ?? {};
    if (status !== "IDLE" && status !== "OFFLINE") {
      throw new CourierError("INVALID_INPUT", 'Status must be "IDLE" or "OFFLINE".');
    }
    const { courier, eventId } = status === "IDLE"
      ? await this.service.goOnDuty(actor)
      : await this.service.goOffDuty(actor);
    res.json({ courier: toDTO(courier), eventId });
  });

  private async respond(res: Response, action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      if (error instanceof CourierError) {
        res.status(statusByCode[error.code]).json({ error: error.message, code: error.code });
      } else {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
}
