import type { Request, Response } from "express";
import { OrderError, type OrderErrorCode } from "../../domain/ord/OrderError.ts";
import type { RatingService } from "./RatingService.ts";

const statusByCode: Record<OrderErrorCode, number> = {
  INVALID_INPUT: 400, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409,
  INVALID_TRANSITION: 409, NOT_QUEUE_FRONT: 409,
};

export class RatingRoutes {
  constructor(private readonly ratings: RatingService) {}

  rate = (req: Request, res: Response) => this.respond(res, async () => {
    const orderId = String(req.params.orderId);
    const rating = await this.ratings.rate(
      req.user,
      /^\d+$/.test(orderId) ? Number(orderId) : NaN,
      req.body ?? {},
    );
    res.status(201).json({
      rating: {
        orderId: rating.orderId,
        restaurantScore: rating.restaurantScore,
        courierScore: rating.courierScore,
        createdAt: rating.createdAt,
      },
    });
  });

  getState = (req: Request, res: Response) => this.respond(res, async () => {
    res.json(await this.ratings.getState(req.user));
  });

  getCourierAverage = (req: Request, res: Response) => this.respond(res, async () => {
    res.json(await this.ratings.getCourierAverage(req.user));
  });

  getCourierRatings = (req: Request, res: Response) => this.respond(res, async () => {
    res.json(await this.ratings.getCourierRatings(req.user));
  });

  getRestaurantRatings = (req: Request, res: Response) => this.respond(res, async () => {
    res.json(await this.ratings.getRestaurantRatings(req.user, String(req.params.restaurantId)));
  });

  private async respond(res: Response, action: () => Promise<void>): Promise<void> {
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
