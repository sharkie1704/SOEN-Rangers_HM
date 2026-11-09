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

  it("explains the read-only platform view and offers useful filters while loading", () => {
    const html = renderToStaticMarkup(createElement(OperatorOrdersPage, {
      restaurants: [
        { id: "restaurant-1", name: "Demo Bakery", status: "OPEN", lat: 45.5, lng: -73.5 },
      ],
    }));

    expect(html).toContain("Monitor order progress across all restaurants.");
    expect(html).toContain("Operator view is read-only.");
    expect(html).toContain("Search orders");
    expect(html).toContain("Order status");
    expect(html).toContain("All statuses");
    expect(html).toContain("Waiting for dispatch");
    expect(html).toContain("Loading platform orders…");
    expect(html).toContain("Refresh");
  });
});
