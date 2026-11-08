import { describe, expect, it } from "vitest";
import { Order } from "../../ord/Order.ts";
import type { StateChangeEvent } from "../../ord/StateChangeEvent.ts";
import { createOrderSummary } from "../OrderSummary.ts";

function order(status: "Delivered" | "Placed" | "Preparing" | "Rejected" | "Cancelled") {
  return Order.restore({
    id: 21,
    restaurantId: "restaurant-1",
    restaurantName: "Demo Bakery",
    customerId: "customer-1",
    lines: [{ menuItemId: 7, name: "Brownie", quantity: 2, unitPriceCents: 450 }],
    fare: {
      subtotalCents: 900,
      deliveryFeeCents: 300,
      serviceFeeCents: 150,
      smallOrderSurchargeCents: 200,
      totalCents: 1550,
    },
    placedAt: new Date("2026-11-07T10:00:00Z"),
    status,
    events: [],
  });
}

const deliveredEvent: StateChangeEvent = {
  eventId: 44,
  orderId: 21,
  actorId: "courier-1",
  action: "deliver",
  from: "PickedUp",
  to: "Delivered",
  occurredAt: new Date("2026-11-07T10:30:00Z"),
};

describe("createOrderSummary", () => {
  it("snapshots the delivered order, stored fare, and delivery timestamps", () => {
    const summary = createOrderSummary(order("Delivered"), deliveredEvent, new Date("2026-11-07T10:31:00Z"));

    expect(summary).toMatchObject({
      orderId: 21,
      customerId: "customer-1",
      restaurantId: "restaurant-1",
      restaurantName: "Demo Bakery",
      lines: [{ name: "Brownie", quantity: 2, unitPriceCents: 450 }],
      fare: {
        subtotalCents: 900,
        deliveryFeeCents: 300,
        serviceFeeCents: 150,
        smallOrderSurchargeCents: 200,
        totalCents: 1550,
      },
      placedAt: new Date("2026-11-07T10:00:00Z"),
      deliveredAt: new Date("2026-11-07T10:30:00Z"),
      generatedAt: new Date("2026-11-07T10:31:00Z"),
    });
    expect(Object.isFrozen(summary)).toBe(true);
    expect(Object.isFrozen(summary.lines)).toBe(true);
    expect(Object.isFrozen(summary.fare)).toBe(true);
  });

  it.each(["Placed", "Preparing", "Rejected", "Cancelled"] as const)(
    "does not create a summary while the order is %s",
    (status) => {
      expect(() => createOrderSummary(order(status), deliveredEvent)).toThrowError(
        expect.objectContaining({ code: "CONFLICT" }),
      );
    },
  );

  it("rejects a delivery event belonging to another order", () => {
    expect(() => createOrderSummary(order("Delivered"), { ...deliveredEvent, orderId: 22 })).toThrowError(
      expect.objectContaining({ code: "CONFLICT" }),
    );
  });

  it("refuses to fabricate a fare for a legacy order without a saved fare", () => {
    const legacy = Order.restore({
      id: 21,
      restaurantId: "restaurant-1",
      customerId: "customer-1",
      lines: [{ menuItemId: 7, name: "Brownie", quantity: 2, unitPriceCents: 450 }],
      placedAt: new Date("2026-11-07T10:00:00Z"),
      status: "Delivered",
      events: [],
    });

    expect(() => createOrderSummary(legacy, deliveredEvent)).toThrowError(
      expect.objectContaining({ code: "CONFLICT" }),
    );
  });
});
