import { describe, expect, it } from "vitest";
import { HandoffService } from "../../dlv/HandoffService.ts";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "../../dlv/__tests__/fakes.ts";
import { OrderService } from "../../ord/OrderService.ts";
import { FakeMenuCatalog, FakePricingSettingsRepository, InMemoryOrderRepository } from "../../ord/__tests__/fakes.ts";
import { Role } from "../../../domain/reg/Role.ts";

describe("operator refund after courier delivery", () => {
  it("refunds an order after the customer-to-courier lifecycle completes", async () => {
    const orders = new InMemoryOrderRepository();
    const menu = new FakeMenuCatalog()
      .addRestaurant("restaurant-1")
      .addItem({ menuItemId: 1, restaurantId: "restaurant-1", name: "Brownie", unitPriceCents: 450 });
    const orderService = new OrderService(orders, menu, new FakePricingSettingsRepository());
    const customer = { userId: "customer-1", role: Role.CUSTOMER } as const;
    const restaurant = { userId: "staff-1", role: Role.RESTAURANT, restaurantId: "restaurant-1" } as const;
    const operator = { userId: "operator-1", role: Role.OPERATOR } as const;

    const placed = await orderService.place(customer, {
      restaurantId: "restaurant-1",
      lines: [{ menuItemId: 1, quantity: 1 }],
    });
    await orderService.accept(restaurant, placed.id);
    await orderService.markReady(restaurant, placed.id);

    const couriers = new InMemoryCourierAvailabilityRepository().withCourier("courier-1", "ASSIGNED");
    const assignments = new InMemoryAssignmentRepository(couriers).withAssignment(placed.id, "courier-1", "Accepted");
    const handoff = new HandoffService(assignments, couriers, orders);

    await handoff.pickUp({ userId: "courier-1", role: Role.COURIER }, placed.id);
    const delivered = await handoff.deliver({ userId: "courier-1", role: Role.COURIER }, placed.id);

    expect(delivered.order.status).toBe("Delivered");
    expect(assignments.summaries).toHaveLength(1);

    const refunded = await orderService.refund(operator, placed.id);

    expect(refunded.order.status).toBe("Refunded");
    expect(refunded.event).toMatchObject({ action: "refund", from: "Delivered", to: "Refunded" });
  });
});
