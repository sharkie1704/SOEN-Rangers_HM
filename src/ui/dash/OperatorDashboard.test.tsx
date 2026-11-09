import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import OperatorDashboard from "./OperatorDashboard";

vi.mock("../ord/OperatorRestaurantsPage", () => ({
  default: () => createElement("section", { "data-testid": "operator-restaurants" }, "Restaurant management"),
}));
vi.mock("../ord/OperatorOrdersPage", () => ({
  default: () => createElement("section", { "data-testid": "operator-orders" }, "Order monitoring"),
}));
vi.mock("../ord/OperatorDispatchQueuePage", () => ({
  default: () => createElement("section", { "data-testid": "operator-dispatch" }, "Dispatch queue"),
}));
vi.mock("../prc/OrderSummaryList", () => ({
  default: () => createElement("section", { "data-testid": "operator-order-history" }, "Delivered order history"),
}));
vi.mock("../prc/BillingLedger", () => ({
  default: () => createElement("section", { "data-testid": "operator-ledger" }, "Billing ledger"),
}));
vi.mock("./OperatorOverview", () => ({
  default: () => createElement("section", { "data-testid": "operator-overview" }, "Platform overview"),
}));

describe("operator dashboard", () => {
  it("renders personalized operator navigation and the overview as the landing page", () => {
    const html = renderToStaticMarkup(createElement(OperatorDashboard, {
      user: { id: "operator-1", role: "OPERATOR", name: "Alex Admin" },
      onLogout: async () => {},
    }));

    expect(html).toContain("Welcome back, Alex!");
    expect(html).toContain("Platform overview");
    expect(html).toContain('aria-current="page" title="Overview"');
    expect(html).toContain('title="Restaurants"');
    expect(html).toContain('title="Orders"');
    expect(html).toContain('title="Dispatch Queue"');
    expect(html).toContain('title="Order History &amp; Billing"');
    expect(html).toContain('title="Simulator Controls"');
    expect(html).toContain(">Log out</button>");
  });

  it("keeps history and ledger destinations separate in the billing navigation", () => {
    const html = renderToStaticMarkup(createElement(OperatorDashboard, {
      user: { id: "operator-2", role: "OPERATOR", name: "Jordan" },
      onLogout: async () => {},
    }));

    expect(html).toContain('title="Order History"');
    expect(html).toContain('title="Billing Ledger"');
    expect(html.match(/data-testid="operator-order-history"/g)).toBeNull();
    expect(html.match(/data-testid="operator-ledger"/g)).toBeNull();
  });
});
