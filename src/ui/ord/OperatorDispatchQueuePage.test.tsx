import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import OperatorDispatchQueuePage, { reassignStalledOrder } from "./OperatorDispatchQueuePage";

afterEach(() => vi.unstubAllGlobals());

describe("operator dispatch queue page", () => {
  it("renders a separate dispatch view with a loading state and refresh action", () => {
    const html = renderToStaticMarkup(createElement(OperatorDispatchQueuePage));

    expect(html).toContain("Dispatch Queue");
    expect(html).toContain("Loading dispatch queue…");
    expect(html).toContain("Refresh queue");
    expect(html).not.toContain("All Orders");
    expect(html).toContain("Stalled Orders");
    expect(html).toContain("Loading stalled orders…");
    expect(html).not.toContain("No stalled orders.");
  });

  it("posts the order ID with authentication and reports a new offer", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ orderId: 7, releasedCourierId: "old-courier", offeredTo: "new-courier" }),
    });
    vi.stubGlobal("fetch", fetch);
    expect(await reassignStalledOrder(7)).toContain("A new offer was sent to courier new-courier");
    expect(fetch).toHaveBeenCalledWith("/api/orders/7/reassign", {
      method: "POST", credentials: "include", headers: undefined, body: undefined,
    });
  });

  it("explains release without a replacement instead of claiming assignment", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ orderId: 7, releasedCourierId: "old-courier", offeredTo: null }),
    }));
    expect(await reassignStalledOrder(7)).toContain("No replacement courier was available; the order is waiting for dispatch.");
  });

  it("propagates rejected commands without reporting success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 409, json: async () => ({ error: "The courier is still on duty." }),
    }));
    await expect(reassignStalledOrder(7)).rejects.toMatchObject({ status: 409, message: "The courier is still on duty." });
  });

  it("propagates network errors without automatically retrying the command", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("Network unavailable"));
    vi.stubGlobal("fetch", fetch);
    await expect(reassignStalledOrder(7)).rejects.toThrow("Network unavailable");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
