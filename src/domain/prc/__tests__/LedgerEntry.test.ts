import { describe, expect, it } from "vitest";
import { Order } from "../../ord/Order.ts";
import type { OrderStatus, StateChangeEvent } from "../../ord/StateChangeEvent.ts";
import { createLedgerEntry } from "../LedgerEntry.ts";

function order(status: OrderStatus, event: StateChangeEvent, includeFare = true) {
  return Order.restore({
    id: 21,
    restaurantId: "restaurant-1",
    restaurantName: "Demo Bakery",
    customerId: "customer-1",
    lines: [{ menuItemId: 7, name: "Brownie", quantity: 2, unitPriceCents: 450 }],
    ...(includeFare ? { fare: {
      subtotalCents: 900,
      deliveryFeeCents: 300,
      serviceFeeCents: 150,
      smallOrderSurchargeCents: 200,
      totalCents: 1550,
    } } : {}),
    placedAt: new Date("2026-11-07T10:00:00Z"),
    status,
    events: [event],
  });
}

function terminalEvent(to: "Delivered" | "Rejected" | "Cancelled"): StateChangeEvent {
  return {
    eventId: 44,
    orderId: 21,
    actorId: "actor-1",
    action: to === "Delivered" ? "deliver" : to === "Rejected" ? "reject" : "cancel",
    from: to === "Delivered" ? "PickedUp" : "Placed",
    to,
    occurredAt: new Date("2026-11-07T10:30:00Z"),
  };
}

describe("createLedgerEntry", () => {
  it("records the delivered fare and delivery timestamp", () => {
    const event = terminalEvent("Delivered");
    const entry = createLedgerEntry(order("Delivered", event), event, 2);

    expect(entry).toEqual({
      eventId: 44,
      orderId: 21,
      finalState: "Delivered",
      epoch: 2,
      placedAt: new Date("2026-11-07T10:00:00Z"),
      finalizedAt: new Date("2026-11-07T10:30:00Z"),
      deliveredAt: new Date("2026-11-07T10:30:00Z"),
      totalChargeCents: 1550,
    });
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it.each(["Rejected", "Cancelled"] as const)("records zero charge when %s", (status) => {
    const event = terminalEvent(status);
    const entry = createLedgerEntry(order(status, event), event, 0);

    expect(entry).toMatchObject({
      finalState: status,
      totalChargeCents: 0,
      deliveredAt: null,
      finalizedAt: event.occurredAt,
    });
  });

  it("does not invent a charge for a legacy delivered order without a fare snapshot", () => {
    const event = terminalEvent("Delivered");
    expect(createLedgerEntry(order("Delivered", event, false), event, 0).totalChargeCents).toBeNull();
  });

  it("rejects non-terminal, mismatched and invalid-epoch events", () => {
    const event = terminalEvent("Delivered");
    const delivered = order("Delivered", event);
    const nonTerminal = { ...event, from: "Ready" as const, to: "PickedUp" as const };

    expect(() => createLedgerEntry(delivered, nonTerminal, 0)).toThrowError(expect.objectContaining({ code: "CONFLICT" }));
    expect(() => createLedgerEntry(delivered, { ...event, orderId: 22 }, 0)).toThrowError(expect.objectContaining({ code: "CONFLICT" }));
    expect(() => createLedgerEntry(delivered, event, -1)).toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
  });
});
