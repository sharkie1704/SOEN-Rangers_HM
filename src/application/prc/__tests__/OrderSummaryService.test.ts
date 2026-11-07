import { describe, expect, it } from "vitest";
import { OrderError } from "../../../domain/ord/OrderError.ts";
import { Role } from "../../../domain/reg/Role.ts";
import type { OrderSummary } from "../../../domain/prc/OrderSummary.ts";
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
const otherSummary = summary(2, "customer-2");

class InMemoryOrderSummaryRepository implements OrderSummaryRepository {
  summaries = [customerSummary, otherSummary];

  async findByCustomer(customerId: string): Promise<readonly OrderSummary[]> {
    return this.summaries.filter((summary) => summary.customerId === customerId);
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

  it.each([Role.RESTAURANT, Role.COURIER])("forbids %s accounts", async (role) => {
    const service = new OrderSummaryService(new InMemoryOrderSummaryRepository());

    await expect(service.list({ userId: "other-user", role })).rejects.toBeInstanceOf(OrderError);
    await expect(service.list({ userId: "other-user", role })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("forbids missing or empty actors", async () => {
    const service = new OrderSummaryService(new InMemoryOrderSummaryRepository());

    await expect(service.list(null)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.list({ userId: " ", role: Role.CUSTOMER })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
