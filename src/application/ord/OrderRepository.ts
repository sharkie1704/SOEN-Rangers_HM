import type { Order } from "../../domain/ord/Order.ts";
import type { PreparationQueue } from "../../domain/ord/PreparationQueue.ts";

export interface OrderRepository {
  nextOrderId(): Promise<number>;
  nextEventId(): Promise<number>;
  add(order: Order): Promise<void>;
  // Persists the order's current status and any events not yet stored
  save(order: Order): Promise<void>;
  findById(orderId: number): Promise<Order | undefined>;
  findByCustomer(customerId: string): Promise<readonly Order[]>;
  findByRestaurant(restaurantId: string): Promise<readonly Order[]>;
  getPreparationQueue(restaurantId: string): Promise<PreparationQueue>;
}
