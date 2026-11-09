import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import CourierDashboard from "./CourierDashboard";

vi.mock("../dlv/CourierAvailabilityPage", () => ({
  default: () => createElement("section", { "data-testid": "courier-availability" }, "Availability feature"),
}));

vi.mock("./DashboardRestaurantMap", () => ({
  default: ({ user }: { user: { id: string; name: string; role: string } }) =>
    createElement("div", {
      "data-testid": "courier-map",
      "data-user-id": user.id,
      "data-user-name": user.name,
      "data-user-role": user.role,
    }),
}));

describe("courier dashboard", () => {
  it("shows a personalized welcome and only implemented courier sections", () => {
    const html = renderToStaticMarkup(createElement(CourierDashboard, {
      user: { id: "courier-1", role: "COURIER", name: "Casey Courier" },
      onLogout: async () => {},
    }));

    expect(html).toContain("Welcome back, Casey!");
    expect(html).toContain("Overview");
    expect(html).toContain("Availability");
    expect(html).toContain("My Deliveries");
    expect(html).toContain('aria-current="page" title="Overview"');
    expect(html).toContain('data-testid="courier-map" data-user-id="courier-1" data-user-name="Casey Courier" data-user-role="COURIER"');
    expect(html).not.toContain("Billing");
  });
});
