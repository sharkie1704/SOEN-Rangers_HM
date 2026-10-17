import type { Order } from "../../domain/ord/Order.ts";
import type { PreparationQueue } from "../../domain/ord/PreparationQueue.ts";

export interface OrderRepository {
  nextOrderId(): number;
  nextEventId(): number;
  add(order: Order): void;
  findById(orderId: number): Order | undefined;
  findByRestaurant(restaurantId: number): readonly Order[];
  getPreparationQueue(restaurantId: number): PreparationQueue;
}
