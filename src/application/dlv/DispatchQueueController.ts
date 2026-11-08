import type { Request, Response } from "express";
import type { DispatchQueueService } from "./DispatchQueueService.ts";
import { respond, toActor } from "./DeliveryHttp.ts";

export class DispatchQueueController {
  constructor(private readonly service: DispatchQueueService) {}

  view = (req: Request, res: Response) => respond(res, async () => {
    const queue = await this.service.view(toActor(req.user));
    res.json({
      waiting: queue.entries.map((entry, index) => ({
        position: index + 1,
        orderId: entry.orderId,
        restaurantId: entry.restaurantId,
        restaurantName: entry.restaurantName,
        readyAt: entry.readyAt.toISOString(),
      })),
    });
  });
}
