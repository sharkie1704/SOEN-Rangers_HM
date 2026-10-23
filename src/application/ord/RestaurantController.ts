import type { Request, Response } from "express";
import type { OrderService } from "./OrderService.ts";
import { runOrderCommand, toActor } from "./MenuController.ts";

// Staff views of their restaurant's orders
export class RestaurantController {
  constructor(private readonly service: OrderService) {}

  incomingOrders = async (req: Request, res: Response): Promise<void> => {
    await runOrderCommand(res, async () => {
      res.status(200).json({ orders: await this.service.incoming(toActor(req.user), String(req.params.restaurantId)) });
    });
  };

  preparationQueue = async (req: Request, res: Response): Promise<void> => {
    await runOrderCommand(res, async () => {
      res.status(200).json({ orders: await this.service.queue(toActor(req.user), String(req.params.restaurantId)) });
    });
  };
}
