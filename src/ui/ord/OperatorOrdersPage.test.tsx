import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OperatorOrdersPage, { restaurantDisplayName } from "./OperatorOrdersPage";

describe("operator orders page", () => {
  it("uses the current restaurant display name when an older order only stored its ID", () => {
    expect(restaurantDisplayName(
      { restaurantId: "restaurant-1", restaurantName: "restaurant-1" },
      [{ id: "restaurant-1", name: "Demo Bakery", status: "OPEN", lat: 45.5, lng: -73.5 }],
    )).toBe("Demo Bakery");
  });

  it("does not expose a raw restaurant ID if its name cannot be resolved", () => {
    expect(restaurantDisplayName(
      { restaurantId: "restaurant-unknown", restaurantName: "restaurant-unknown" },
      [],
    )).toBe("Restaurant");
  });

  it("keeps the merged All Orders view with search, status filters, and loading state", () => {
    const html = renderToStaticMarkup(createElement(OperatorOrdersPage, {
      restaurants: [
        { id: "restaurant-1", name: "Demo Bakery", status: "OPEN", lat: 45.5, lng: -73.5 },
      ],
    }));

    expect(html).toContain("All Orders");
    expect(html).toContain("Search orders");
    expect(html).toContain("Active");
    expect(html).toContain("Delivered");
    expect(html).toContain("Cancelled / Rejected");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Loading orders…");
    expect(html).toContain("Refresh orders");
    expect(html).not.toContain("Waiting for dispatch");
  });
});
