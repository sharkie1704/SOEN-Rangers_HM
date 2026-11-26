import { describe, expect, it } from "vitest";
import { OrderError } from "../../ord/OrderError.ts";
import { Rating } from "../Rating.ts";

const scale = { min: 1, max: 5 };
const input = {
  orderId: 42,
  customerId: "customer-1",
  restaurantId: "restaurant-1",
  courierId: "courier-1",
  restaurantScore: 1,
  courierScore: 5,
};

describe("Rating", () => {
  it("stores the order, participants, scores at both boundaries, and creation time", () => {
    const createdAt = new Date("2026-11-24T12:00:00Z");
    const rating = new Rating(input, scale, createdAt);

    expect(rating).toMatchObject(input);
    expect(rating.createdAt).toEqual(createdAt);
    expect(rating.createdAt).not.toBe(createdAt);
  });

  it("uses the supplied inclusive scale for both scores", () => {
    const scores = { restaurantScore: 3, courierScore: 7 };
    expect(new Rating({ ...input, ...scores }, { min: 3, max: 7 })).toMatchObject(scores);
    expect(() => new Rating({ ...input, ...scores }, scale)).toThrow("Courier score");
  });

  describe.each([
    ["restaurantScore", "Restaurant score"],
    ["courierScore", "Courier score"],
  ] as const)("%s validation", (field, label) => {
    it.each([0, 6, 1.5, NaN, Infinity, "3", null, undefined])(
      "rejects %s without coercion",
      (score) => {
        const createRating = () => new Rating({ ...input, [field]: score as number }, scale);

        expect(createRating).toThrow(OrderError);
        expect(createRating).toThrow(expect.objectContaining({
          code: "INVALID_INPUT",
          message: `${label} must be a whole number between 1 and 5.`,
        }));
      },
    );
  });
});
