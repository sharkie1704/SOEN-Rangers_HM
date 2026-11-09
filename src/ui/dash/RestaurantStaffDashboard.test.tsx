import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import RestaurantStaffDashboard from "./RestaurantStaffDashboard";

type DashboardProps = ComponentProps<typeof RestaurantStaffDashboard>;

function renderDashboard(overrides: Partial<DashboardProps> = {}) {
  const props: DashboardProps = {
    user: {
      id: "staff-1",
      role: "RESTAURANT",
      name: "Riley Baker",
      restaurantId: "restaurant-1",
    },
    restaurantId: "restaurant-1",
    onLogout: async () => {},
    ...overrides,
  };

  return renderToStaticMarkup(createElement(RestaurantStaffDashboard, props));
}

vi.mock("../ord/RestaurantConsolePage", () => ({
  default: ({ restaurantId }: { restaurantId: string }) =>
    createElement(
      "div",
      { "data-testid": "restaurant-orders", "data-restaurant-id": restaurantId, "aria-label": "Restaurant orders" },
      createElement("h2", null, "Orders view"),
      createElement("p", null, "Incoming and in-progress orders"),
    ),
}));

vi.mock("../ord/MenuEditorPage", () => ({
  default: ({ restaurantId }: { restaurantId: string }) =>
    createElement(
      "div",
      { "data-testid": "restaurant-menu", "data-restaurant-id": restaurantId, "aria-label": "Restaurant menu" },
      createElement("h2", null, "Menu view"),
      createElement("p", null, "Manage items and availability"),
    ),
}));

vi.mock("./DashboardRestaurantMap", () => ({
  default: ({ user }: { user: { id: string; role: string; restaurantId: string } }) =>
    createElement("div", {
      "data-testid": "restaurant-map",
      "data-user-id": user.id,
      "data-user-role": user.role,
      "data-restaurant-id": user.restaurantId,
    }),
}));

describe("restaurant staff dashboard", () => {
  it("shows the shared restaurant staff shell with an unboxed intro", () => {
    const html = renderDashboard();

    expect(html).toContain("DessertDash");
    expect(html).toContain("Riley Baker");
    expect(html).toContain("Restaurant Staff");
    expect(html).toContain(">Log out</button>");
    expect(html).toContain('class="restaurant-staff-dashboard__intro"');
    expect(html).toContain("Keep your shift running smoothly.");
    expect(html).not.toContain("<strong>Keep your shift running smoothly.</strong>");
    expect(html).toContain("Orders and menu updates are right here.");
    expect(html).toContain('aria-label="Collapse navigation"');
    expect(html).toContain('aria-label="Dashboard sidebar"');
  });

  it("provides accessible Orders and Menu navigation with Orders selected initially", () => {
    const html = renderDashboard();

    expect(html).toContain("Orders");
    expect(html).toContain("Menu");
    expect(html).toContain('aria-current="page" title="Orders"');
    expect(html).toContain('title="Menu"');
    expect(html).toContain('aria-label="Dashboard navigation"');
    expect(html).toContain("<nav");
    expect(html).toContain("<ul");
    expect(html).toContain("<button");
  });

  it("keeps the assigned restaurant context for the map and active orders view", () => {
    const html = renderDashboard();

    expect(html).toContain('data-testid="restaurant-map" data-user-id="staff-1" data-user-role="RESTAURANT" data-restaurant-id="restaurant-1"');
    expect(html).toContain('data-testid="restaurant-orders" data-restaurant-id="restaurant-1" aria-label="Restaurant orders"');
    expect(html).toContain("<h2>Orders view</h2>");
    expect(html).toContain("Incoming and in-progress orders");
    expect(html).not.toContain('data-testid="restaurant-menu"');
  });

  it("uses a different assigned restaurant consistently", () => {
    const html = renderDashboard({
      user: { id: "staff-2", role: "RESTAURANT", name: "Jordan Lee", restaurantId: "restaurant-42" },
      restaurantId: "restaurant-42",
    });

    expect(html).toContain('data-testid="restaurant-map" data-user-id="staff-2" data-user-role="RESTAURANT" data-restaurant-id="restaurant-42"');
    expect(html).toContain('data-testid="restaurant-orders" data-restaurant-id="restaurant-42" aria-label="Restaurant orders"');
    expect(html).toContain("Jordan Lee");
    expect(html).not.toContain('data-restaurant-id="restaurant-1"');
  });

  it("uses the signed-in user ID in the header when the account has no display name", () => {
    const html = renderDashboard({
      user: { id: "staff-no-name", role: "RESTAURANT", restaurantId: "restaurant-1" },
    });

    expect(html).toContain("staff-no-name");
    expect(html).toContain('data-testid="restaurant-map" data-user-id="staff-no-name" data-user-role="RESTAURANT" data-restaurant-id="restaurant-1"');
  });

  it("escapes special characters in staff names in the rendered header", () => {
    const html = renderDashboard({
      user: { id: "staff-3", role: "RESTAURANT", name: "Riley <Baker>", restaurantId: "restaurant-1" },
    });

    expect(html).toContain("Riley &lt;Baker&gt;");
    expect(html).not.toContain("Riley <Baker>");
  });
});
