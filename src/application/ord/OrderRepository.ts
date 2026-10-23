import type { Order } from "../../domain/ord/Order.ts";
import type { PreparationQueue } from "../../domain/ord/PreparationQueue.ts";

export interface OrderRepository {
  nextOrderId(): Promise<number>;
  nextEventId(): Promise<number>;
  add(order: Order): Promise<void>;
  // Persists the order's current status and any events not yet stored
  save(order: Order): Promise<void>;
  findById(orderId: number): Promise<Order | undefined>;
  findByRestaurant(restaurantId: string): Promise<readonly Order[]>;
  findByCustomer(customerId: string): Promise<readonly Order[]>;
  getPreparationQueue(restaurantId: string): Promise<PreparationQueue>;
  // Runs work in one transaction holding the restaurant's queue lock, so two queue changes never interleave
  withQueueLock<T>(restaurantId: string, work: (orders: OrderRepository) => Promise<T>): Promise<T>;
}
