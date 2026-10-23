import type { Request, Response } from "express";
import { z } from "zod";
import { OrderError } from "../../domain/ord/OrderError.ts";
import type { OrderService } from "./OrderService.ts";
import { runOrderCommand, toActor } from "./MenuController.ts";

const placeOrderSchema = z.object({
  restaurantId: z.string(),
  lines: z.array(z.object({ menuItemId: z.number(), quantity: z.number() })),
});

export class OrderController {
  constructor(private readonly service: OrderService) {}

  place = async (req: Request, res: Response): Promise<void> => {
    await runOrderCommand(res, async () => {
      const parsed = placeOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new OrderError("INVALID_INPUT", "An order needs a restaurant ID and a list of items.");
      }
      const order = await this.service.place(toActor(req.user), parsed.data);
      res.status(201).json({ order });
    });
  };

  mine = async (req: Request, res: Response): Promise<void> => {
    await runOrderCommand(res, async () => {
      res.status(200).json({ orders: await this.service.mine(toActor(req.user)) });
    });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    await runOrderCommand(res, async () => {
      res.status(200).json({ order: await this.service.get(toActor(req.user), Number(req.params.orderId)) });
    });
  };

  accept = async (req: Request, res: Response): Promise<void> => {
    await runOrderCommand(res, async () => {
      res.status(200).json(await this.service.accept(toActor(req.user), Number(req.params.orderId)));
    });
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    await runOrderCommand(res, async () => {
      const { reason } = req.body ?? {};
      res.status(200).json(await this.service.reject(toActor(req.user), Number(req.params.orderId), typeof reason === "string" ? reason : ""));
    });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    await runOrderCommand(res, async () => {
      res.status(200).json(await this.service.cancel(toActor(req.user), Number(req.params.orderId)));
    });
  };

  markReady = async (req: Request, res: Response): Promise<void> => {
    await runOrderCommand(res, async () => {
      res.status(200).json(await this.service.markReady(toActor(req.user), Number(req.params.orderId)));
    });
  };
}
