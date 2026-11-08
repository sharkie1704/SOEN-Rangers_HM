import { OrderError } from "../../domain/ord/OrderError.ts";
import { Role } from "../../domain/reg/Role.ts";
import type { OrderSummary } from "../../domain/prc/OrderSummary.ts";
import type { OrderSummaryRepository } from "./OrderSummaryRepository.ts";

export interface OrderSummaryActor {
  readonly userId: string;
  readonly role: Role;
}

export class OrderSummaryService {
  constructor(private readonly summaries: OrderSummaryRepository) {}

  async list(actor: OrderSummaryActor | null): Promise<readonly OrderSummary[]> {
    if (!actor || !actor.userId.trim()) {
      throw new OrderError("FORBIDDEN", "An authenticated customer or operator is required.");
    }
    if (actor.role === Role.CUSTOMER) {
      return this.summaries.findByCustomer(actor.userId);
    }
    if (actor.role === Role.OPERATOR) {
      return this.summaries.findAll();
    }
    throw new OrderError("FORBIDDEN", "Only customers and operators can view order summaries.");
  }
}
