import { describe, expect, it } from "vitest";
import { calculateSubtotalCents } from "../calculateSubtotalCents.ts";
import { Order } from "../Order.ts";
import { OrderLine } from "../OrderLine.ts";

function line(
  menuItemId: number,
  quantity: number,
  unitPriceCents: number,
): OrderLine {
  return new OrderLine({
    menuItemId,
    name: `Item ${menuItemId}`,
    quantity,
    unitPriceCents,
  });
}

describe("calculateSubtotalCents", () => {
  // Two items at 350 cents plus one at 500 cents should total 1200 cents.
  it("sums order-line totals in cents", () => {
    const lines = [
      line(1, 2, 350),
      line(2, 1, 500),
    ];

    expect(calculateSubtotalCents(lines)).toBe(1200);
  });

  // No lines means there is nothing to add, so the subtotal is zero.
  it("returns zero for an empty collection", () => {
    expect(calculateSubtotalCents([])).toBe(0);
  });

  // The largest whole number JavaScript can store exactly is still allowed.
  it("accepts the maximum safe integer subtotal", () => {
    const lines = [
      line(1, 1, Number.MAX_SAFE_INTEGER - 1),
      line(2, 1, 1),
    ];

    expect(calculateSubtotalCents(lines)).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  // Each line is valid, but their sum is too large to store exactly.
  it("rejects subtotal overflow from individually valid lines", () => {
    const lines = [
      line(1, 1, Number.MAX_SAFE_INTEGER),
      line(2, 1, 1),
    ];

    expect(() => calculateSubtotalCents(lines)).toThrow(
      expect.objectContaining({
        code: "INVALID_INPUT",
        message: "Order total exceeds the supported amount.",
      }),
    );
  });
});

describe("Order subtotal integration", () => {
  // An order should still return the item subtotal without any extra fees.
  it("preserves Order.totalCents as the item subtotal", () => {
    const order = new Order({
      id: 1,
      restaurantId: "rest-a",
      customerId: "customer-a",
      lines: [
        {
          menuItemId: 1,
          name: "Macaron",
          quantity: 2,
          unitPriceCents: 350,
        },
        {
          menuItemId: 2,
          name: "Eclair",
          quantity: 1,
          unitPriceCents: 500,
        },
      ],
    });

    expect(order.totalCents).toBe(1200);
  });

  // Creating an order should fail right away if its subtotal is too large.
  it("still rejects subtotal overflow during construction", () => {
    expect(() => new Order({
      id: 1,
      restaurantId: "rest-a",
      customerId: "customer-a",
      lines: [
        {
          menuItemId: 1,
          name: "First item",
          quantity: 1,
          unitPriceCents: Number.MAX_SAFE_INTEGER,
        },
        {
          menuItemId: 2,
          name: "Second item",
          quantity: 1,
          unitPriceCents: 1,
        },
      ],
    })).toThrow(
      expect.objectContaining({
        code: "INVALID_INPUT",
        message: "Order total exceeds the supported amount.",
      }),
    );
  });
});
