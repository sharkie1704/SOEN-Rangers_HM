import { describe, expect, it } from "vitest";
import { formatRestaurantRating } from "./ratingSummary";

describe("formatRestaurantRating", () => {
  it("shows a one-decimal average, star and count", () => {
    expect(formatRestaurantRating({ average: 4.25, count: 12 })).toBe("4.3 ★ (12 ratings)");
  });

  it("shows the empty state instead of zero or NaN", () => {
    expect(formatRestaurantRating({ average: null, count: 0 })).toBe("No ratings yet");
  });
});
