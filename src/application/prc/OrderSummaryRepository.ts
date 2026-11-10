import type { OrderSummary } from "../../domain/prc/OrderSummary.ts";

export interface OrderSummaryRepository {
  findByCustomer(customerId: string): Promise<readonly OrderSummary[]>;
  findByRestaurant(restaurantId: string): Promise<readonly OrderSummary[]>;
  findByCourier(courierId: string): Promise<readonly OrderSummary[]>;
  findAll(): Promise<readonly OrderSummary[]>;
}
