import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import OperatorOverview from "./OperatorOverview";

vi.mock("./MapView", () => ({
  default: ({ restaurants }: { restaurants: readonly { id: string }[] }) =>
    createElement("div", { "data-testid": "overview-map", "data-restaurants": restaurants.length }),
}));

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
    expect(html).toContain('data-testid="overview-map" data-restaurants="2"');
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
});
