import { useState, type FormEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { api, ApiError } from "../reg/api/client";
import OrderRatingForm from "./OrderRatingForm";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return { ...react, useState: vi.fn(react.useState), useId: () => "rating" };
});
vi.mock("../reg/api/client", async (importOriginal) => {
  const client = await importOriginal<typeof import("../reg/api/client")>();
  return { ...client, api: vi.fn() };
});

afterEach(() => vi.resetAllMocks());

function ratingForm() {
  let error = "";
  const onSaved = vi.fn();
  const props = { orderId: 42, scale: { min: 2, max: 5 }, onSaved, onDuplicate: vi.fn() };
  function render() {
    vi.mocked(useState)
      .mockReturnValueOnce([2, vi.fn()])
      .mockReturnValueOnce([5, vi.fn()])
      .mockReturnValueOnce([false, vi.fn()])
      .mockReturnValueOnce([error, (message: unknown) => {
        if (typeof message === "string") error = message;
      }]);
    return OrderRatingForm(props);
  }
  return {
    onSaved,
    submit: () => render().props.onSubmit({ preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>),
    html: () => renderToStaticMarkup(render()),
  };
}

it("submits both selected scores together", async () => {
  vi.mocked(api).mockResolvedValueOnce({});
  const form = ratingForm();
  await form.submit();

  expect(api).toHaveBeenCalledExactlyOnceWith("/api/orders/42/rating", {
    method: "POST", body: { restaurantScore: 2, courierScore: 5 },
  });
  expect(form.onSaved).toHaveBeenCalledOnce();
});

it("displays the backend refusal and keeps the form available", async () => {
  vi.mocked(api).mockRejectedValueOnce(new ApiError(409, "Only delivered orders can be rated."));
  const form = ratingForm();
  await form.submit();

  expect(form.html()).toContain('<p role="alert">Only delivered orders can be rated.</p>');
  expect(form.onSaved).not.toHaveBeenCalled();
});
