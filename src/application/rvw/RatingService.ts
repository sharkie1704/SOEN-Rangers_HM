import { OrderError, requireId } from "../../domain/ord/OrderError.ts";
import { hasPermission, type PermissionUser } from "../../domain/reg/permissions/index.ts";
import { Rating, type RatingScale } from "../../domain/rvw/Rating.ts";
import type { OrderRepository } from "../ord/OrderRepository.ts";
import type { RatingRepository } from "./RatingRepository.ts";

export class RatingService {
  constructor(
    private readonly orders: Pick<OrderRepository, "findById">,
    private readonly ratings: RatingRepository,
    private readonly scale: RatingScale,
  ) {}

  async rate(
    actor: PermissionUser | undefined,
    orderId: number,
    scores: { restaurantScore?: unknown; courierScore?: unknown },
  ): Promise<Rating> {
    const customerId = this.requireCustomer(actor);
    requireId(orderId, "Order ID");
    if (orderId > 2_147_483_647) {
      throw new OrderError("INVALID_INPUT", "Order ID exceeds the supported range.");
    }
    const order = await this.orders.findById(orderId);
    if (!order) throw new OrderError("NOT_FOUND", "Order was not found.");
    if (order.customerId !== customerId) {
      throw new OrderError("FORBIDDEN", "You can only rate your own orders.");
    }
    if (order.status !== "Delivered") {
      throw new OrderError("CONFLICT", "Only delivered orders can be rated.");
    }

    const delivery = order.events.find((event) =>
      event.orderId === order.id && event.action === "deliver"
      && event.from === "PickedUp" && event.to === "Delivered",
    );
    if (!delivery?.actorId.trim()) {
      throw new OrderError("CONFLICT", "The courier who delivered this order could not be verified.");
    }

    const rating = new Rating({
      orderId: order.id,
      customerId,
      restaurantId: order.restaurantId,
      courierId: delivery.actorId,
      restaurantScore: typeof scores.restaurantScore === "number" ? scores.restaurantScore : NaN,
      courierScore: typeof scores.courierScore === "number" ? scores.courierScore : NaN,
    }, this.scale);

    if (await this.ratings.existsForOrder(order.id)) {
      throw new OrderError("CONFLICT", "This order has already been rated.");
    }
    await this.ratings.create(rating);
    return rating;
  }

  async getState(actor: PermissionUser | undefined) {
    const customerId = this.requireCustomer(actor);
    return { scale: this.scale, ratedOrderIds: await this.ratings.findRatedOrderIds(customerId) };
  }

  private requireCustomer(actor: PermissionUser | undefined): string {
    if (!actor || !hasPermission({ name: "rateOrder" }, actor)) {
      throw new OrderError("FORBIDDEN", "Only customers can rate orders.");
    }
    return actor.id;
  }
}
