import type { Restaurant } from "../../domain/ord/Restaurant.ts";
import { OrderError, requireStringId } from "../../domain/ord/OrderError.ts";
import { Role } from "../../domain/reg/Role.ts";
import type { RestaurantStatusRepository } from "./RestaurantStatusRepository.ts";

export type StatusActor =
  | { readonly userId: string; readonly role: Role.RESTAURANT; readonly restaurantId: string }
  | { readonly userId: string; readonly role: Role.OPERATOR };

export class RestaurantStatusService {
  private readonly repository: RestaurantStatusRepository;

  constructor(repository: RestaurantStatusRepository) {
    this.repository = repository;
  }

  async pause(actor: StatusActor | null, restaurantId: string): Promise<{ restaurant: Restaurant; eventId: number }> {
    const restaurant = await this.findRestaurant(restaurantId);
    const who = this.requireStaffOfOrOperator(actor, restaurant.id);
    return this.record(restaurant, who.userId, restaurant.pause());
  }

  async reopen(actor: StatusActor | null, restaurantId: string): Promise<{ restaurant: Restaurant; eventId: number }> {
    const restaurant = await this.findRestaurant(restaurantId);
    const who = this.requireStaffOfOrOperator(actor, restaurant.id);
    return this.record(restaurant, who.userId, restaurant.reopen());
  }

  private async record(restaurant: Restaurant, actorId: string, fromStatus: Restaurant["status"]) {
    const eventId = await this.repository.nextEventId();
    await this.repository.save(restaurant, {
      eventId,
      restaurantId: restaurant.id,
      actorId,
      fromStatus,
      toStatus: restaurant.status,
      occurredAt: new Date(),
    });
    return { restaurant, eventId };
  }

  private requireStaffOfOrOperator(actor: StatusActor | null, restaurantId: string): StatusActor {
    if (actor?.role === Role.OPERATOR) return actor;
    if (actor?.role === Role.RESTAURANT && actor.restaurantId === restaurantId) return actor;
    throw new OrderError("FORBIDDEN", "Only this restaurant's staff or an operator can pause or reopen it.");
  }

  private async findRestaurant(restaurantId: string): Promise<Restaurant> {
    const restaurant = await this.repository.findById(requireStringId(restaurantId, "Restaurant ID"));
    if (!restaurant) {
      throw new OrderError("NOT_FOUND", "Restaurant was not found.");
    }
    return restaurant;
  }
}