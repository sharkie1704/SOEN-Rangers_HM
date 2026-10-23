import type { Request, Response } from "express";
import type { AuthenticatedUser } from "../../domain/reg/Session.ts";
import { Role } from "../../domain/reg/Role.ts";
import { OrderError } from "../../domain/ord/OrderError.ts";
import type { RestaurantStatusService, StatusActor } from "./RestaurantStatusService.ts";
import { runOrderCommand } from "./MenuController.ts";

function toStatusActor(user: AuthenticatedUser | undefined): StatusActor | null {
  if (user?.role === Role.OPERATOR) return { userId: user.id, role: Role.OPERATOR };
  if (user?.role === Role.RESTAURANT && user.restaurantId) {
    return { userId: user.id, role: Role.RESTAURANT, restaurantId: user.restaurantId };
  }
  return null;
}

export class RestaurantStatusController {
  constructor(private readonly service: RestaurantStatusService) {}

  update = async (req: Request, res: Response): Promise<void> => {
    await runOrderCommand(res, async () => {
      const actor = toStatusActor(req.user);
      const id = String(req.params.restaurantId);
      const { status } = req.body ?? {};
      if (status !== "PAUSED" && status !== "OPEN") {
        throw new OrderError("INVALID_INPUT", 'Status must be "PAUSED" or "OPEN".');
      }
      const { restaurant, eventId } = status === "PAUSED"
        ? await this.service.pause(actor, id)
        : await this.service.reopen(actor, id);
      res.status(200).json({ restaurant: { id: restaurant.id, status: restaurant.status }, eventId });
    });
  };
}
