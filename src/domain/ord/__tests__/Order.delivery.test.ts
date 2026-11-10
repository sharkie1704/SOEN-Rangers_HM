import { describe, it, expect } from "vitest";
import { Order } from "../Order.ts";
import type { OrderStatus } from "../StateChangeEvent.ts";

function orderIn(status: OrderStatus): Order {
  return Order.restore({
    id: 1,
    restaurantId: "rest-a",
    customerId: "customer-1",
    lines: [{ menuItemId: 1, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
    placedAt: new Date("2026-11-04T12:00:00Z"),
    status,
    events: [],
  });
}

describe("Order pickup and delivery", () => {
  it("moves a ready order to picked up and records the event", () => {
    const order = orderIn("Ready");

    const event = order.pickUp("courier-1", 10);

    expect(order.status).toBe("PickedUp");
    expect(event).toMatchObject({ eventId: 10, orderId: 1, actorId: "courier-1", action: "pick-up", from: "Ready", to: "PickedUp" });
    expect(order.events).toHaveLength(1);
  });

  it("moves a picked up order to delivered and records the event", () => {
    const order = orderIn("PickedUp");

    const event = order.deliver("courier-1", 11);

    expect(order.status).toBe("Delivered");
    expect(event).toMatchObject({ eventId: 11, action: "deliver", from: "PickedUp", to: "Delivered" });
  });

  it("moves a delivered order to refunded and records the event", () => {
    const order = orderIn("Delivered");

    const event = order.refund("operator-1", 12);

    expect(order.status).toBe("Refunded");
    expect(event).toMatchObject({ eventId: 12, actorId: "operator-1", action: "refund", from: "Delivered", to: "Refunded" });
  });

  it.each<OrderStatus>(["Placed", "Accepted", "Preparing", "PickedUp", "Delivered", "Rejected", "Cancelled"])(
    "refuses pickup from %s",
    (status) => {
      const order = orderIn(status);

      expect(() => order.pickUp("courier-1", 10)).toThrowError(expect.objectContaining({ code: "INVALID_TRANSITION" }));
      expect(order.status).toBe(status);
      expect(order.events).toHaveLength(0);
    },
  );

  it.each<OrderStatus>(["Placed", "Accepted", "Preparing", "Ready", "Refunded", "Rejected", "Cancelled"])(
    "refuses delivery from %s",
    (status) => {
      const order = orderIn(status);

      expect(() => order.deliver("courier-1", 11)).toThrowError(expect.objectContaining({ code: "INVALID_TRANSITION" }));
      expect(order.status).toBe(status);
      expect(order.events).toHaveLength(0);
    },
  );

  it.each<OrderStatus>(["Placed", "Accepted", "Preparing", "PickedUp", "Refunded", "Rejected", "Cancelled"])(
    "refuses refund from %s",
    (status) => {
      const order = orderIn(status);

      expect(() => order.refund("operator-1", 12)).toThrowError(expect.objectContaining({ code: "INVALID_TRANSITION" }));
      expect(order.status).toBe(status);
      expect(order.events).toHaveLength(0);
    },
  );

  it.each(["accept", "cancel", "startPreparing", "markReady"] as const)("refuses %s once delivered", (action) => {
    const order = orderIn("Delivered");

    expect(() => order[action]("actor-1", 12)).toThrowError(expect.objectContaining({ code: "INVALID_TRANSITION" }));
  });

  it("refuses a second refund", () => {
    const order = orderIn("Refunded");

    expect(() => order.refund("operator-1", 13)).toThrowError(expect.objectContaining({ code: "INVALID_TRANSITION" }));
  });
});
