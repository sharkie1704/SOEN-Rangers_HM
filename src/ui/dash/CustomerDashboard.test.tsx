import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import CustomerDashboard from "./CustomerDashboard";
import WelcomePage from "./WelcomePage";

vi.mock("../ord/CustomerFlow", () => ({
  default: ({ activeView }: { activeView: string }) =>
    createElement("div", { "data-testid": "customer-flow", "data-active-view": activeView }, "Customer flow"),
}));

vi.mock("./DashboardRestaurantMap", () => ({
  default: ({
    user,
    onViewMenu,
  }: {
    user: { id: string; name: string; role: string };
    onViewMenu?: (restaurantId: string) => void;
  }) =>
    createElement(
      "div",
      {
        "data-testid": "restaurant-map",
        "data-user-id": user.id,
        "data-user-name": user.name,
        "data-user-role": user.role,
        "data-can-open-menu": String(Boolean(onViewMenu)),
      },
      "Restaurant map",
    ),
}));

describe("customer dashboard", () => {
  it("renders the shared dashboard shell with browse selected by default", () => {
    const html = renderToStaticMarkup(
      createElement(CustomerDashboard, {
        user: { id: "customer-1", role: "CUSTOMER", name: "Taylor Sample" },
        onLogout: async () => {},
      }),
    );

    expect(html).toContain("Browse Restaurants");
    expect(html).toContain("My Orders");
    expect(html).toContain("Welcome back, Taylor!");
    expect(html).toContain("Explore restaurants nearby");
    expect(html).toContain('aria-current="page" title="Browse Restaurants"');
    expect(html).toContain('title="My Orders"');
    expect(html).toContain('aria-label="Dashboard navigation"');
    expect(html).toContain('aria-label="Dashboard output console"');
    expect(html).toContain('title="Output Console"');
    expect(html).toContain('aria-label="Collapse navigation"');
    expect(html).toContain(">Log out</button>");
    expect(html).toContain('data-testid="customer-flow" data-active-view="browse"');
  });

  it("passes the signed-in customer into the map with the menu-open callback", () => {
    const html = renderToStaticMarkup(
      createElement(CustomerDashboard, {
        user: { id: "customer-1", role: "CUSTOMER", name: "Taylor Sample" },
        onLogout: async () => {},
      }),
    );

    expect(html).toContain('data-testid="restaurant-map"');
    expect(html).toContain('data-user-id="customer-1"');
    expect(html).toContain('data-user-name="Taylor Sample"');
    expect(html).toContain('data-user-role="CUSTOMER"');
    expect(html).toContain('data-can-open-menu="true"');
  });

  it("uses safe display-name fallbacks for unnamed customer accounts", () => {
    const html = renderToStaticMarkup(
      createElement(CustomerDashboard, {
        user: { id: "customer-2", role: "CUSTOMER" },
        onLogout: async () => {},
      }),
    );

    expect(html).toContain("Welcome back, there!");
    expect(html).toContain('data-user-name="User"');
  });
});

describe("customer welcome", () => {
  it("greets the customer by first name and starts collapsed accessibly", () => {
    const html = renderToStaticMarkup(createElement(WelcomePage, { name: "Taylor Sample" }));

    expect(html).toContain("Welcome back, Taylor!");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="');
    expect(html).toContain('hidden=""');
    expect(html).toContain("✦");
  });

  it("uses a friendly fallback when a customer name is empty", () => {
    const html = renderToStaticMarkup(createElement(WelcomePage, { name: "   " }));

    expect(html).toContain("Welcome back, there!");
  });

  it("trims extra spaces before selecting the customer's first name", () => {
    const html = renderToStaticMarkup(createElement(WelcomePage, { name: "   Morgan   Lee  " }));

    expect(html).toContain("Welcome back, Morgan!");
    expect(html).not.toContain("Welcome back,    ");
  });

  it("keeps the expanded copy hidden initially and associates it with the toggle", () => {
    const html = renderToStaticMarkup(createElement(WelcomePage, { name: "Morgan Lee" }));
    const controlsId = html.match(/aria-controls="([^"]+)"/)?.[1];

    expect(controlsId).toBeTruthy();
    expect(html).toContain(`id="${controlsId}"`);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('hidden=""');
    expect(html).toContain("Your next favourite dessert might be just around the corner.");
  });
});
