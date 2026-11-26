import { createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { useApi } from "../reg/api/useApi";
import OrderRatingForm from "../rvw/OrderRatingForm";
import CustomerOrderHistory from "./CustomerOrderHistory";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return { ...react, useState: vi.fn(react.useState) };
});
vi.mock("../reg/api/useApi", async (importOriginal) => {
  const hooks = await importOriginal<typeof import("../reg/api/useApi")>();
  return { ...hooks, useApi: vi.fn() };
});
vi.mock("../rvw/OrderRatingForm", () => ({
  default: vi.fn(({ orderId }: { orderId: number }) => <form aria-label={`Rate order #${orderId}`} />),
}));

afterEach(() => vi.clearAllMocks());

function historyView() {
  const orders = ["Delivered", "Delivered", "Refunded", "Placed"].map((status, index) => ({
    id: index + 1, status, placedAt: "2026-11-25T12:00:00Z", lines: [],
  }));
  let feedback: unknown = {};
  const setFeedback = (update: unknown) => {
    feedback = typeof update === "function" ? update(feedback) : update;
  };
  return () => {
    const resource = { loading: false, error: "", setError: vi.fn(), setData: vi.fn(), reload: vi.fn() };
    vi.mocked(useApi)
      .mockReturnValueOnce({ ...resource, data: { summaries: [] } })
      .mockReturnValueOnce({ ...resource, data: orders })
      .mockReturnValueOnce({ ...resource, data: { scale: { min: 1, max: 5 }, ratedOrderIds: [2] } });
    vi.mocked(useState)
      .mockReturnValueOnce(["delivered", vi.fn()])
      .mockReturnValueOnce([feedback, setFeedback])
      .mockReturnValueOnce([null, vi.fn()]);
    return renderToStaticMarkup(createElement(CustomerOrderHistory));
  };
}

it("offers a rating only for a delivered, unrated order", () => {
  const html = historyView()();
  expect(html.match(/aria-label="Rate order #[0-9]+"/g)).toEqual(['aria-label="Rate order #1"']);
});

it("hides the form and confirms submission after a successful save", () => {
  const render = historyView();
  expect(render()).toContain("Rate order #1");
  vi.mocked(OrderRatingForm).mock.calls[0][0].onSaved();

  const html = render();
  expect(html).not.toContain("Rate order #1");
  expect(html).toContain("Rating submitted. Thank you!");
});
