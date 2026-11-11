import type { Request, Response } from "express";
import type { ReassignmentService } from "./ReassignmentService.ts";
import { orderIdFrom, respond, toActor } from "./DeliveryHttp.ts";

export class ReassignmentController {
  constructor(private readonly service: ReassignmentService) {}

  stalled = (req: Request, res: Response) => respond(res, async () => {
    res.json({ stalled: await this.service.listStalled(toActor(req.user)) });
  });

  reassign = (req: Request, res: Response) => respond(res, async () => {
    const actor = toActor(req.user);
    res.json(await this.service.reassign(actor, orderIdFrom(req)));
  });
}
