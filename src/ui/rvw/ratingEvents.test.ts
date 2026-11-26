import { expect, it, vi } from "vitest";
import { publishRestaurantRatingUpdate, subscribeToRestaurantRatingUpdates } from "./ratingEvents";

it("refreshes only the details panel for the restaurant whose rating changed", () => {
  const refreshBakery = vi.fn();
  const refreshCafe = vi.fn();
  const unsubscribe = subscribeToRestaurantRatingUpdates("bakery", refreshBakery);
  const unsubscribeCafe = subscribeToRestaurantRatingUpdates("cafe", refreshCafe);

  publishRestaurantRatingUpdate("bakery");

  expect(refreshBakery).toHaveBeenCalledOnce();
  expect(refreshCafe).not.toHaveBeenCalled();
  unsubscribe();
  unsubscribeCafe();
});
