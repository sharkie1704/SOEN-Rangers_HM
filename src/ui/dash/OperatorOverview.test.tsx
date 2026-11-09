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
  it("shows truthful restaurant totals, quick actions, and only mapped locations", () => {
    const html = renderToStaticMarkup(createElement(OperatorOverview, {
      restaurants,
      loading: false,
      error: "",
      onRefresh: () => {},
      onNavigate: () => {},
    }));

    expect(html).toContain("Total restaurants");
    expect(html).toContain("Open");
    expect(html).toContain("Paused");
    expect(html).toContain("Closed");
    expect(html).toContain("<dd><span class=\"operator-overview__value\">3</span>");
    expect(html).toContain("View orders");
    expect(html).toContain("Manage restaurants");
    expect(html).toContain('data-testid="overview-map" data-restaurants="2"');
    expect(html).not.toContain("N/A");
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
