import type { Request, Response } from "express";
import type { HandoffResult, HandoffService } from "./HandoffService.ts";
import { orderIdFrom, respond, toActor } from "./DeliveryHttp.ts";

function toDTO({ order, courier }: HandoffResult) {
  return { order: { id: order.id, status: order.status }, courier: { id: courier.courierId, status: courier.status } };
}

export class HandoffController {
  constructor(private readonly service: HandoffService) {}

  pickUp = (req: Request, res: Response) => respond(res, async () => {
    res.json(toDTO(await this.service.pickUp(toActor(req.user), orderIdFrom(req))));
  });

  deliver = (req: Request, res: Response) => respond(res, async () => {
    res.json(toDTO(await this.service.deliver(toActor(req.user), orderIdFrom(req))));
  });
}
