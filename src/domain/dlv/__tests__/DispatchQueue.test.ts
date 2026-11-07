import { describe, expect, it } from "vitest";
import { DispatchQueue, type WaitingOrder } from "../DispatchQueue.ts";

function waiting(orderId: number, readyAt: string): WaitingOrder {
  return { orderId, restaurantId: "rest-a", restaurantName: "Sweet Spot", readyAt: new Date(readyAt) };
}

describe("DispatchQueue", () => {
  it("puts the order that has waited longest first", () => {
    const queue = new DispatchQueue([
      waiting(3, "2026-11-06T12:10:00Z"),
      waiting(1, "2026-11-06T12:00:00Z"),
      waiting(2, "2026-11-06T12:05:00Z"),
    ]);

    expect(queue.entries.map((entry) => entry.orderId)).toEqual([1, 2, 3]);
    expect(queue.next()?.orderId).toBe(1);
    expect(queue.size).toBe(3);
  });

  it("breaks ties by order ID", () => {
    const queue = new DispatchQueue([waiting(9, "2026-11-06T12:00:00Z"), waiting(4, "2026-11-06T12:00:00Z")]);

    expect(queue.entries.map((entry) => entry.orderId)).toEqual([4, 9]);
  });

  it("is empty when nothing is waiting", () => {
    const queue = new DispatchQueue([]);

    expect(queue.size).toBe(0);
    expect(queue.next()).toBeUndefined();
  });
});
