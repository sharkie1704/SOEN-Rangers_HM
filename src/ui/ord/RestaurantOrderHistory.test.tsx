import { createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import RestaurantOrderHistory from "./RestaurantOrderHistory";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return { ...react, useState: vi.fn(react.useState), useEffect: vi.fn() };
});
vi.mock("../prc/OrderSummaryList", () => ({
  default: ({ restaurantView }: { restaurantView: boolean }) => createElement("div", null, restaurantView ? "Existing restaurant summaries" : "Wrong scope"),
}));

afterEach(() => vi.clearAllMocks());

function render(view = "orders", orders: unknown[] = [], loading = false, error = "") {
  const values = [view, orders, loading, error, 0];
  let index = 0;
  vi.mocked(useState).mockImplementation((() => [values[index++], vi.fn()]) as unknown as typeof useState);
  return renderToStaticMarkup(createElement(RestaurantOrderHistory, { restaurantId: "restaurant-a" }));
}

it("shows delivered, rejected, cancelled and legacy orders without inventing charges", () => {
  const orders = ["Delivered", "Rejected", "Cancelled", "Delivered"].map((status, index) => ({
    id: index + 1, status, placedAt: "2026-11-07T10:00:00Z", totalCents: 450,
    lines: [{ menuItemId: 1, name: "Brownie", quantity: 1 }],
    fare: index === 3 ? undefined : { totalCents: 1100 },
  }));
  const html = render("orders", orders);
  for (const status of ["Delivered", "Rejected", "Cancelled"]) expect(html).toContain(status);
  expect(html.match(/Saved final charge/g)).toHaveLength(1);
  expect(html).toContain("$11.00");
  expect(html).toContain("Item subtotal: $4.50");
  expect(html).toContain("Historical final charge unavailable.");
  expect(html).not.toContain("Existing restaurant summaries");
});

it("keeps existing delivered summaries in a separate view without duplicate order cards", () => {
  const html = render("summaries");
  expect(html).toContain("Existing restaurant summaries");
  expect(html).not.toContain("No restaurant orders yet.");
  expect(html).not.toContain('class="order-card"');
});

it("distinguishes loading, successful empty history and request errors", () => {
  expect(render("orders", [], true)).toContain('role="status">Loading restaurant history');
  expect(render()).toContain("No restaurant orders yet.");
  const failed = render("orders", [], false, "Access denied");
  expect(failed).toContain('role="alert">Access denied');
  expect(failed).not.toContain("No restaurant orders yet.");
});
