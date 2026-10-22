import type { Request, Response } from "express";
import type { AuthenticatedUser } from "../../domain/reg/Session.ts";
import { Role } from "../../domain/reg/Role.ts";
import { OrderError, type OrderErrorCode } from "../../domain/ord/OrderError.ts";
import type { OrderActor } from "./OrderActor.ts";
import type { OrderController } from "./OrderController.ts";

const statusByCode: Record<OrderErrorCode, number> = {
  INVALID_INPUT: 400, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409,
  INVALID_TRANSITION: 409, NOT_QUEUE_FRONT: 409,
};

function toActor(user: AuthenticatedUser | undefined): OrderActor | null {
  if (user?.role === Role.CUSTOMER) return { userId: user.id, role: Role.CUSTOMER };
  if (user?.role === Role.RESTAURANT && user.restaurantId) {
    return { userId: user.id, role: Role.RESTAURANT, restaurantId: user.restaurantId };
  }
  return null;
}

export class OrderRoutes {
  constructor(private readonly orders: OrderController) {}

  listMine = (req: Request, res: Response) => this.respond(res, async () => {
    res.json({ orders: await this.orders.customerOrders(toActor(req.user)) });
  });

  getOne = (req: Request, res: Response) => this.respond(res, async () => {
    res.json({ order: await this.orders.get(toActor(req.user), Number(req.params.orderId)) });
  });

  private async respond(res: Response, action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      if (error instanceof OrderError) {
        res.status(statusByCode[error.code]).json({ error: error.message, code: error.code });
      } else {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
}
