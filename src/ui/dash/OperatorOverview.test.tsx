import { createElement, useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import OperatorOverview from "./OperatorOverview";
import PublicRestaurantPanel, { getQueuePresentation } from "./map-popup/PublicRestaurantPopup";
import type { MapRestaurant } from "./MapView";
import type { OperatorRestaurant } from "../ord/OperatorRestaurantsPage";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return { ...react, useEffect: vi.fn(react.useEffect), useState: vi.fn(react.useState) };
});

vi.mock("./MapView", () => ({
  default: ({ restaurants }: { restaurants: readonly MapRestaurant[] }) =>
    createElement("div", { "data-testid": "overview-map", "data-restaurants": restaurants.length },
      restaurants.map((restaurant) => createElement("span", { key: restaurant.id },
        `${restaurant.id}: ${restaurant.queue.length ?? getQueuePresentation(restaurant).label} (${getQueuePresentation(restaurant).band})`))),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(useEffect).mockReset();
  vi.mocked(useState).mockReset();
  vi.mocked(useEffect).mockImplementation(() => {});
  vi.mocked(useState).mockImplementation(((initial: unknown) => [initial, () => {}]) as unknown as typeof useState);
});

// Capture the queue effect and its state setter without adding a browser test dependency.
function renderOverview(
  data: readonly OperatorRestaurant[] = restaurants,
  snapshot: unknown = null,
) {
  const setSnapshot = vi.fn();
  const effects: (() => void | (() => void))[] = [];
  let stateIndex = 0;
  vi.mocked(useState).mockImplementation(((initial: unknown) => {
    const index = stateIndex++;
    return index === 4 ? [snapshot, setSnapshot] : [initial, () => {}];
  }) as unknown as typeof useState);
  vi.mocked(useEffect).mockImplementation((effect) => { effects.push(effect); });
  const html = renderToStaticMarkup(createElement(OperatorOverview, {
    restaurants: data, loading: false, error: "", onRefresh: () => {}, onNavigate: () => {},
  }));
  return { html, setSnapshot, runQueueEffect: effects[0] };
}

const restaurants = [
  { id: "open-1", name: "Open Bakery", status: "OPEN" as const, lat: 45.5, lng: -73.5 },
  { id: "paused-1", name: "Paused Sweets", status: "PAUSED" as const, lat: null, lng: null },
  { id: "closed-1", name: "Closed Cakes", status: "CLOSED" as const, lat: 45.51, lng: -73.52 },
];

describe("operator overview", () => {
  it("shows all six platform cards, quick actions, and only mapped locations", () => {
    const html = renderToStaticMarkup(createElement(OperatorOverview, {
      restaurants,
      loading: false,
      error: "",
      onRefresh: () => {},
      onNavigate: () => {},
    }));

    expect(html).toContain("Total Orders");
    expect(html).toContain("Active Orders");
    expect(html).toContain("Delivered Orders");
    expect(html).toContain("Open Restaurants");
    expect(html).toContain("Paused Restaurants");
    expect(html).toContain("Available Couriers");
    expect(html).toContain("N/A");
    expect(html).toContain("<dt>Open Restaurants</dt><dd><span class=\"operator-overview__value\">1</span>");
    expect(html).toContain("<dt>Paused Restaurants</dt><dd><span class=\"operator-overview__value\">1</span>");
    expect(html).toContain("View orders");
    expect(html).toContain("Manage restaurants");
    expect(html).toContain("Loading preparation queue counts");
    expect(html).toContain('data-testid="overview-map"');
    expect(html).toContain("open-1: Queue loading… (unknown)");
  });

  it("provides a retry action when restaurant data cannot be loaded", () => {
    const html = renderToStaticMarkup(createElement(OperatorOverview, {
      restaurants: [],
      loading: false,
      error: "Could not load restaurants.",
      onRefresh: () => {},
      onNavigate: () => {},
    }));

    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not load restaurants.");
    expect(html).toContain("Try again");
    expect(html).not.toContain('data-testid="overview-map"');
  });

  it("requests real counts concurrently only for valid mapped restaurants and displays their bands", async () => {
    const fetch = vi.fn().mockImplementation(async (path: string) => ({
      ok: true, status: 200, json: async () => ({ queuedCount: path.includes("open-1") ? 3 : 6 }),
    }));
    vi.stubGlobal("fetch", fetch);
    const data = [...restaurants, { ...restaurants[0], id: "invalid", lat: 100 }];
    const view = renderOverview(data);
    view.runQueueEffect();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith("/api/restaurants/open-1/orders/queue-count", expect.objectContaining({ credentials: "include" }));
    await vi.waitFor(() => expect(view.setSnapshot).toHaveBeenCalledTimes(2));
    const snapshot = view.setSnapshot.mock.calls[1][0];
    const html = renderOverview(data, snapshot).html;
    expect(html).toContain("open-1: 3 (building)");
    expect(html).toContain("closed-1: 6 (long)");
    expect(html).toContain('data-restaurants="2"');
  });

  it("keeps failed-count restaurants visible with unavailable queues", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "Unavailable" }) }));
    const view = renderOverview();
    view.runQueueEffect();
    await vi.waitFor(() => expect(view.setSnapshot).toHaveBeenCalledTimes(2));
    const html = renderOverview(restaurants, view.setSnapshot.mock.calls[1][0]).html;
    expect(html).toContain("Could not load preparation queue counts for 2 restaurant(s)");
    expect(html).toContain('data-testid="overview-map"');
    expect(html).toContain('data-restaurants="2"');
    expect(html).toContain("open-1: Queue unavailable (unknown)");
    expect(html).not.toContain("No mapped restaurant locations yet");
  });

  it("handles empty restaurant lists without requesting counts", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const view = renderOverview([]);
    view.runQueueEffect();
    await vi.waitFor(() => expect(view.setSnapshot).toHaveBeenCalledTimes(2));
    expect(fetch).not.toHaveBeenCalled();
    expect(view.html).toContain("No mapped restaurant locations yet");
  });

  it("ignores responses after cleanup and hides snapshots from older restaurant data", async () => {
    let resolve!: (response: unknown) => void;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise((done) => { resolve = done; })));
    const oldData = [restaurants[0]];
    const oldView = renderOverview(oldData);
    const cleanup = oldView.runQueueEffect();
    cleanup?.();
    resolve({ ok: true, status: 200, json: async () => ({ queuedCount: 6 }) });
    await new Promise((done) => setTimeout(done, 0));
    expect(oldView.setSnapshot).toHaveBeenCalledTimes(1); // Only the initial loading reset.
    const html = renderOverview([...oldData], { restaurants: oldData, counts: new Map([["open-1", 6]]), failed: [] }).html;
    expect(html).toContain("Loading preparation queue counts");
    expect(html).toContain("open-1: Queue loading… (unknown)");
    expect(html).not.toContain("open-1: 6");
  });

  it("preserves existing known-count colours without requiring an availability property", () => {
    for (const [length, color] of [[0, "#2e7d32"], [2, "#2e7d32"], [3, "#f9a825"], [5, "#f9a825"], [6, "#c62828"]] as const) {
      expect(getQueuePresentation({ status: "OPEN", queue: { length } }).color).toBe(color);
    }
    const restaurant: MapRestaurant = { id: "legacy", name: "Bakery", status: "OPEN", lat: 45, lng: -73, queue: { length: 2 } };
    expect(renderToStaticMarkup(createElement(PublicRestaurantPanel, { restaurant }))).toContain("2 order(s)");
  });

  it("shows truthful unknown labels and keeps paused restaurants red", () => {
    for (const availability of ["loading", "unavailable"] as const) {
      const queue = { availability };
      expect(getQueuePresentation({ status: "OPEN", queue }).color).toBe("#757575");
      expect(getQueuePresentation({ status: "PAUSED", queue }).color).toBe("#c62828");
      const restaurant: MapRestaurant = { id: "unknown", name: "Bakery", status: "PAUSED", lat: 45, lng: -73, queue };
      const html = renderToStaticMarkup(createElement(PublicRestaurantPanel, { restaurant }));
      expect(html).toContain(availability === "loading" ? "Queue loading…" : "Queue unavailable");
      expect(html).not.toContain("0 order(s)");
    }
  });
});
