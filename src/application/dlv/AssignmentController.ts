import type { Request, Response } from "express";
import type { Assignment } from "../../domain/dlv/Assignment.ts";
import type { AssignmentService } from "./AssignmentService.ts";
import { orderIdFrom, respond, toActor } from "./DeliveryHttp.ts";

function toDTO(assignment: Assignment) {
  return { orderId: assignment.orderId, courierId: assignment.courierId, status: assignment.status };
}

export class AssignmentController {
  constructor(private readonly service: AssignmentService) {}

  accept = (req: Request, res: Response) => respond(res, async () => {
    const { assignment, eventId } = await this.service.accept(toActor(req.user), orderIdFrom(req));
    res.json({ assignment: toDTO(assignment), eventId });
  });

  decline = (req: Request, res: Response) => respond(res, async () => {
    const { assignment, eventId } = await this.service.decline(toActor(req.user), orderIdFrom(req));
    res.json({ assignment: toDTO(assignment), eventId });
  });
}
