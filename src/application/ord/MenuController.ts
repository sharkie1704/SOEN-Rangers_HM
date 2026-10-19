import type { Request, Response } from "express";
import type { AuthenticatedUser } from "../../domain/reg/Session.ts";
import { Role } from "../../domain/reg/Role.ts";
import { OrderError, type OrderErrorCode } from "../../domain/ord/OrderError.ts";
import type { MenuItem } from "../../domain/ord/MenuItem.ts";
import type { MenuService } from "./MenuService.ts";
import type { OrderActor } from "./OrderActor.ts";

// The domain object has private fields, so build the JSON shape explicitly
function toMenuItemDTO(item: MenuItem) {
  return {
    id: item.id,
    restaurantId: item.restaurantId,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    priceCents: item.priceCents,
    available: item.available,
  };
}

// Turns the logged-in user (set by the session gate) into the actor the service expects.
// Couriers and operators have no ORD menu commands, so they get no actor and the service refuses them.
function toActor(user: AuthenticatedUser | undefined): OrderActor | null {
  if (!user) return null;
  if (user.role === Role.CUSTOMER) {
    return { userId: user.id, role: Role.CUSTOMER };
  }
  if (user.role === Role.RESTAURANT && user.restaurantId) {
    return { userId: user.id, role: Role.RESTAURANT, restaurantId: user.restaurantId };
  }
  return null;
}

const statusByCode: Record<OrderErrorCode, number> = {
  INVALID_INPUT: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_TRANSITION: 409,
  NOT_QUEUE_FRONT: 409,
};

export class MenuController {
  constructor(private readonly menu: MenuService) {}

  add = async (req: Request, res: Response): Promise<void> => {
    await this.run(res, async () => {
      const { name, description = "", imageUrl = "", priceCents, available = true } = req.body ?? {};
      const item = await this.menu.add(toActor(req.user), {
        restaurantId: String(req.params.restaurantId),
        name,
        description,
        imageUrl,
        priceCents,
        available,
      });
      res.status(201).json({ item: toMenuItemDTO(item) });
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    await this.run(res, async () => {
      const actor = toActor(req.user);
      const itemId = Number(req.params.itemId);
      const { name, priceCents, available } = req.body ?? {};

      let item = await this.menu.update(actor, itemId, { name, priceCents });
      let eventId: number | null = null;
      if (typeof available === "boolean") {
        ({ item, eventId } = await this.menu.setAvailable(actor, itemId, available));
      }
      res.status(200).json({ item: toMenuItemDTO(item), eventId });
    });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.run(res, async () => {
      await this.menu.remove(toActor(req.user), Number(req.params.itemId));
      res.status(204).end();
    });
  };

  // One place that turns domain errors into HTTP responses, so every handler behaves the same
  private async run(res: Response, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      if (error instanceof OrderError) {
        res.status(statusByCode[error.code]).json({ error: error.message, code: error.code });
        return;
      }
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
