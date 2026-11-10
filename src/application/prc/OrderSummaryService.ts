import { OrderError } from "../../domain/ord/OrderError.ts";
import { Role } from "../../domain/reg/Role.ts";
import type { RoleScopedOrderSummary } from "../../domain/prc/OrderSummary.ts";
import type { LedgerRepository } from "./LedgerRepository.ts";
import type { OrderSummaryRepository } from "./OrderSummaryRepository.ts";

export interface OrderSummaryActor {
  readonly userId: string;
  readonly role: Role;
  readonly restaurantId?: string;
}

export class OrderSummaryService {
  constructor(
    private readonly summaries: OrderSummaryRepository,
    private readonly ledger?: LedgerRepository,
  ) {}

  async list(actor: OrderSummaryActor | null): Promise<readonly RoleScopedOrderSummary[]> {
    if (!actor || !actor.userId.trim()) {
      throw new OrderError("FORBIDDEN", "An authenticated user is required.");
    }
    let summaries;
    if (actor.role === Role.CUSTOMER) {
      summaries = await this.summaries.findByCustomer(actor.userId);
    } else if (actor.role === Role.RESTAURANT) {
      if (!actor.restaurantId?.trim()) {
        throw new OrderError("FORBIDDEN", "A valid restaurant ID is required for restaurant accounts.");
      }
      summaries = await this.summaries.findByRestaurant(actor.restaurantId);
    } else if (actor.role === Role.COURIER) {
      summaries = await this.summaries.findByCourier(actor.userId);
    } else if (actor.role === Role.OPERATOR) {
      summaries = await this.summaries.findAll();
    } else {
      throw new OrderError("FORBIDDEN", "The account role cannot view order history.");
    }

    const ledgerByOrder = actor.role === Role.OPERATOR && this.ledger
      ? new Map((await this.ledger.read()).entries.map((entry) => [entry.orderId, entry]))
      : undefined;

    return summaries.map((summary) => {
      if (actor.role === Role.COURIER) {
        return {
          orderId: summary.orderId,
          customerId: summary.customerId,
          restaurantId: summary.restaurantId,
          restaurantName: summary.restaurantName,
          lines: summary.lines.map(({ unitPriceCents: _unitPriceCents, ...line }) => line),
          placedAt: summary.placedAt,
          deliveredAt: summary.deliveredAt,
          generatedAt: summary.generatedAt,
        };
      }
      return {
        ...summary,
        ...(ledgerByOrder?.has(summary.orderId) ? { ledger: ledgerByOrder.get(summary.orderId) } : {}),
      };
    });
  }
}
