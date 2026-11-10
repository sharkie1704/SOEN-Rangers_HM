import { describe, expect, it, vi } from "vitest";
import { publishCommandEvent, publishOutputEvent, subscribeToCommandEvents, subscribeToOutputEvents } from "./CommandEvents";

describe("command event streams", () => {
  it("notifies existing refresh subscribers only for successful commands", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToCommandEvents(listener);

    publishCommandEvent("GET", 200);
    publishCommandEvent("POST", 400);
    expect(listener).not.toHaveBeenCalled();

    publishCommandEvent("POST", 201);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    publishCommandEvent("PATCH", 200);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("publishes command and error details to output subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToOutputEvents(listener);
    const before = Date.now();

    publishOutputEvent({ method: "POST", path: "/api/orders", status: 201 });
    publishOutputEvent({ method: "POST", path: "/api/orders/quote", status: 400 });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, expect.objectContaining({
      method: "POST",
      path: "/api/orders",
      status: 201,
    }));
    expect(Date.parse(listener.mock.calls[0][0].timestamp)).toBeGreaterThanOrEqual(before);
    expect(listener.mock.calls[1][0]).toEqual(expect.objectContaining({
      method: "POST",
      path: "/api/orders/quote",
      status: 400,
    }));
    unsubscribe();
  });
});
