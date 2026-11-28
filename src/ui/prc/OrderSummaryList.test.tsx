import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Exercise mount and refresh handlers without a browser or additional dependencies.
const harness = vi.hoisted(() => ({
  states: [] as unknown[], index: 0, effects: [] as (() => unknown)[], api: vi.fn(),
}));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useId: () => "details",
  useState: (initial: unknown) => {
    const index = harness.index++;
    if (!(index in harness.states)) harness.states[index] = initial;
    return [harness.states[index], (value: unknown) => { harness.states[index] = value; }];
  },
  useEffect: (effect: () => unknown) => { harness.effects.push(effect); },
}));
vi.mock("../reg/api/client", () => ({ api: harness.api, ApiError: class extends Error {} }));
import OrderSummaryList, { SummaryDetails } from "./OrderSummaryList";

const record = (orderId: number) => ({
  orderId, restaurantName: "Bakery", lines: [{ name: "Brownie", quantity: 2 }],
  placedAt: "2026-11-01T10:00:00Z", deliveredAt: "2026-11-01T11:00:00Z", generatedAt: null,
});
function renderList(courierView = true) {
  harness.index = 0;
  return OrderSummaryList({ courierView });
}
function primeList(summaries: ReturnType<typeof record>[], rating: { average: number; count: number } | null) {
  harness.states = [
    null,
    { summaries }, false, "", 0,
    { scale: { min: 1, max: 5 }, rating }, false, "", 0,
  ];
}
function refreshButton(node: unknown): ReactElement<{ onClick: () => Promise<void> }> | undefined {
  if (!node || typeof node !== "object") return;
  const element = node as ReactElement<{ children?: unknown; onClick: () => Promise<void> }>;
  if (element.type === "button") return element;
  const children = element.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = refreshButton(child);
    if (found) return found;
  }
}
beforeEach(() => {
  harness.states = []; harness.index = 0; harness.effects = []; harness.api.mockReset();
});
describe("courier delivery history", () => {
  it("shows the average with a star and count after enough deliveries", () => {
    primeList([1, 2, 3, 4, 5].map(record), { average: 4.2, count: 3 });
    const html = renderToStaticMarkup(renderList());
    expect(html).toContain("★ 4.2 / 5");
    expect(html).toContain("(3 ratings)");
  });

  it("shows No ratings yet when the courier has no rating", () => {
    primeList([1, 2, 3, 4, 5].map(record), null);
    const html = renderToStaticMarkup(renderList());
    expect(html).toContain("No ratings yet");
  });

  it("shows the average rating only in courier view", () => {
    primeList([1, 2, 3, 4, 5].map(record), { average: 4, count: 1 });
    const html = renderToStaticMarkup(renderList(false));
    expect(html).not.toContain("Average rating:");
    expect(html).not.toContain("4.0 ★");
  });

  it("mounts and refreshes from courier history, showing newly returned deliveries", async () => {
    harness.api.mockResolvedValueOnce({ summaries: [record(11)] });
    renderList();
    harness.effects[0]();
    await vi.waitFor(() => expect(harness.states[2]).toBe(false));
    let tree = renderList();
    expect(renderToStaticMarkup(tree)).toContain("Order #11");
    harness.api.mockResolvedValueOnce({ summaries: [record(11), record(12)] });
    await refreshButton(tree)!.props.onClick();
    harness.effects = [];
    renderList();
    harness.effects[0]();
    await vi.waitFor(() => expect(harness.states[2]).toBe(false));
    tree = renderList();
    expect(renderToStaticMarkup(tree)).toContain("Order #12");
    expect(harness.api.mock.calls).toEqual([
      ["/api/couriers/me/history"], ["/api/couriers/me/history"],
    ]);
  });

  it("renders legacy delivery details without inventing a summary or charge", () => {
    const html = renderToStaticMarkup(createElement(SummaryDetails, { summary: { ...record(10), deliveredAt: null } }));
    expect(html).toContain("DELIVERY RECORD");
    expect(html).toContain("Unavailable");
    expect(html).toContain("2 × Brownie");
    expect(html).not.toContain("Summary created");
    expect(html).not.toContain("Total charged");
    expect(html).not.toContain("Invalid Date");
  });

  it("keeps saved summary details when present", () => {
    const html = renderToStaticMarkup(createElement(SummaryDetails, {
      summary: { ...record(11), generatedAt: "2026-11-01T11:01:00Z" },
    }));
    expect(html).toContain("ORDER SUMMARY");
    expect(html).toContain("Summary created");
  });
});
