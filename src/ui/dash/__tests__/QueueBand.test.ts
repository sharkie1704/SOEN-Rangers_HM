import { describe, expect, it } from "vitest";
import { queueBand } from "../QueueBand.ts";

function restaurant(status: "OPEN" | "PAUSED") {
  return (queueLength: number) => ({ status, queue: { length: queueLength } });
}

describe("queueBand", () => {
  it.each([0, 2])("returns short for %i queued orders", (queueLength) => {
    expect(queueBand(restaurant("OPEN")(queueLength))).toBe("short");
  });

  it.each([3, 5])("returns building for %i queued orders", (queueLength) => {
    expect(queueBand(restaurant("OPEN")(queueLength))).toBe("building");
  });

  it.each([6, 10])("returns long for %i queued orders", (queueLength) => {
    expect(queueBand(restaurant("OPEN")(queueLength))).toBe("long");
  });

  it.each([0, 4])("returns long when paused with %i queued orders", (queueLength) => {
    expect(queueBand(restaurant("PAUSED")(queueLength))).toBe("long");
  });
});
