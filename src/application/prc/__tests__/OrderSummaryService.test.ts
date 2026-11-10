import { describe, expect, it } from "vitest";
import { Role } from "../../../domain/reg/Role.ts";
import type { OrderSummary } from "../../../domain/prc/OrderSummary.ts";
import type { LedgerRepository } from "../LedgerRepository.ts";
import type { OrderSummaryRepository } from "../OrderSummaryRepository.ts";
import { OrderSummaryService } from "../OrderSummaryService.ts";

function summary(orderId: number, customerId: string): OrderSummary {
  return {
    orderId,
    customerId,
    restaurantId: "restaurant-1",
    restaurantName: "Demo Bakery",
    lines: [],
    fare: {
      subtotalCents: 0,
      deliveryFeeCents: 0,
      serviceFeeCents: 0,
      smallOrderSurchargeCents: 0,
      totalCents: 0,
    },
    placedAt: new Date("2026-11-07T10:00:00Z"),
    deliveredAt: new Date("2026-11-07T10:30:00Z"),
    generatedAt: new Date("2026-11-07T10:31:00Z"),
  };
}

const customerSummary = summary(1, "customer-1");
const otherSummary = { ...summary(2, "customer-2"), restaurantId: "restaurant-2" };

class InMemoryOrderSummaryRepository implements OrderSummaryRepository {
  summaries = [customerSummary, otherSummary];

  async findByCustomer(customerId: string): Promise<readonly OrderSummary[]> {
    return this.summaries.filter((summary) => summary.customerId === customerId);
  }

  async findByRestaurant(restaurantId: string): Promise<readonly OrderSummary[]> {
    return this.summaries.filter((summary) => summary.restaurantId === restaurantId);
  }

  async findByCourier(courierId: string): Promise<readonly OrderSummary[]> {
    return courierId === "courier-1" ? [customerSummary] : [];
  }

  async findAll(): Promise<readonly OrderSummary[]> {
    return this.summaries;
  }
}

describe("OrderSummaryService", () => {
  it("returns only the authenticated customer's summaries", async () => {
    const service = new OrderSummaryService(new InMemoryOrderSummaryRepository());

    await expect(service.list({ userId: "customer-1", role: Role.CUSTOMER }))
      .resolves.toEqual([customerSummary]);
  });

  it("allows operators to view all summaries", async () => {
    const repository = new InMemoryOrderSummaryRepository();
    const service = new OrderSummaryService(repository);

    await expect(service.list({ userId: "operator-1", role: Role.OPERATOR }))
      .resolves.toEqual(repository.summaries);
  });

  it("shows the latest ledger state when a delivered order is refunded", async () => {
    const ledger: LedgerRepository = {
      async read() {
        return {
          currentEpoch: 0,
          entries: [
            {
              eventId: 12,
              orderId: 1,
              finalState: "Refunded",
              epoch: 0,
              placedAt: customerSummary.placedAt,
              finalizedAt: new Date("2026-11-07T11:00:00Z"),
              deliveredAt: null,
              totalChargeCents: 0,
            },
            {
              eventId: 11,
              orderId: 1,
              finalState: "Delivered",
              epoch: 0,
              placedAt: customerSummary.placedAt,
              finalizedAt: customerSummary.deliveredAt,
              deliveredAt: customerSummary.deliveredAt,
              totalChargeCents: 1000,
            },
          ],
        };
      },
      async startNewEpoch() { return 1; },
    };
    const service = new OrderSummaryService(new InMemoryOrderSummaryRepository(), ledger);

    const [result] = await service.list({ userId: "operator-1", role: Role.OPERATOR });

    expect(result.ledger?.finalState).toBe("Refunded");
    expect(result.ledger?.eventId).toBe(12);
  });

  it("returns only the restaurant's summaries", async () => {
    const service = new OrderSummaryService(new InMemoryOrderSummaryRepository());

    await expect(service.list({ userId: "restaurant-user", role: Role.RESTAURANT, restaurantId: "restaurant-1" }))
      .resolves.toEqual([customerSummary]);
  });

  it("returns completed deliveries without payment details to couriers", async () => {
    const service = new OrderSummaryService(new InMemoryOrderSummaryRepository());

    await expect(service.list({ userId: "courier-1", role: Role.COURIER })).resolves.toEqual([{
      orderId: customerSummary.orderId,
      customerId: customerSummary.customerId,
      restaurantId: customerSummary.restaurantId,
      restaurantName: customerSummary.restaurantName,
      lines: [],
      placedAt: customerSummary.placedAt,
      deliveredAt: customerSummary.deliveredAt,
      generatedAt: customerSummary.generatedAt,
    }]);
  });

  it("forbids restaurant actors without a restaurant scope", async () => {
    const service = new OrderSummaryService(new InMemoryOrderSummaryRepository());

    await expect(service.list({ userId: "restaurant-user", role: Role.RESTAURANT }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("forbids missing or empty actors", async () => {
    const service = new OrderSummaryService(new InMemoryOrderSummaryRepository());

    await expect(service.list(null)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.list({ userId: " ", role: Role.CUSTOMER })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
