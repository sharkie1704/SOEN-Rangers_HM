import type { OrderSummary } from "../../domain/prc/OrderSummary.ts";

export interface OrderSummaryRepository {
  findByCustomer(customerId: string): Promise<readonly OrderSummary[]>;
  findAll(): Promise<readonly OrderSummary[]>;
}
