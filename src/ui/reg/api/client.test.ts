import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";
import { subscribeToLocalOutputEvents } from "./OutputEvents";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API client output reporting", () => {
  it("reports a request that fails before receiving an HTTP response", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToLocalOutputEvents(listener);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network unavailable")));

    await expect(api("/api/orders", { method: "POST" })).rejects.toThrow("Network unavailable");

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      method: "POST",
      path: "/api/orders",
      status: 0,
    }));
    unsubscribe();
  });
});
