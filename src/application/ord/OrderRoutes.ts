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
  // Normalize the serialized session role before mapping it to the order domain.
  // This keeps the route boundary resilient to enum/string representations.
  if (!user || typeof user.id !== "string" || user.id.trim() === "") return null;
  const role = String(user.role).toUpperCase();
  if (role === "CUSTOMER") return { userId: user.id, role: Role.CUSTOMER };
  if (role === "RESTAURANT" && user.restaurantId) {
    return { userId: user.id, role: Role.RESTAURANT, restaurantId: user.restaurantId };
  }
  return null;
}

export class OrderRoutes {
  constructor(private readonly orders: OrderController) {}

  place = (req: Request, res: Response) => this.respond(res, async () => {
    const order = await this.orders.place(toActor(req.user), req.body ?? {});
    res.status(201).json({ order });
  });

  listMine = (req: Request, res: Response) => this.respond(res, async () => {
    res.json({ orders: await this.orders.customerOrders(toActor(req.user)) });
  });

  getOne = (req: Request, res: Response) => this.respond(res, async () => {
    res.json({ order: await this.orders.get(toActor(req.user), Number(req.params.orderId)) });
  });

  cancel = (req: Request, res: Response) => this.respond(res, async () => {
    res.json({ transition: await this.orders.cancel(toActor(req.user), Number(req.params.orderId)) });
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
