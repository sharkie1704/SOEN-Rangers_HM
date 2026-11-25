import { describe, expect, it } from "vitest";
import { loadRatingConfig, parseRatingConfig } from "../rating-config.ts";

describe("rating configuration", () => {
  it("loads the project's 1–5 scale", async () => {
    await expect(loadRatingConfig()).resolves.toEqual({ rating: { min: 1, max: 5 } });
  });

  it.each([{ min: 2, max: 8 }, { min: 3, max: 3 }])("accepts a configured range %j", (rating) => {
    expect(parseRatingConfig(JSON.stringify({ rating }))).toEqual({ rating });
  });

  it.each([
    [{}, "rating"],
    [{ rating: { max: 5 } }, "min"],
    [{ rating: { min: 1 } }, "max"],
    [{ rating: { min: 0, max: 5 } }, "min"],
    [{ rating: { min: 1, max: -1 } }, "max"],
    [{ rating: { min: 1.5, max: 5 } }, "min"],
    [{ rating: { min: 1, max: 5.5 } }, "max"],
    [{ rating: { min: "1", max: 5 } }, "min"],
    [{ rating: { min: 1, max: 2_147_483_648 } }, "max"],
    [{ rating: { min: 1, max: 5, step: 1 } }, "step"],
  ] as const)("rejects configuration %j", (input, field) => {
    expect(() => parseRatingConfig(JSON.stringify(input))).toThrow(field);
  });

  it("rejects an inverted range", () => {
    expect(() => parseRatingConfig('{"rating":{"min":5,"max":1}}'))
      .toThrow("Rating maximum must be greater than or equal to the minimum.");
  });

  it("rejects malformed JSON", () => {
    expect(() => parseRatingConfig("{")).toThrow(SyntaxError);
  });

  it("reports a missing configuration file", async () => {
    await expect(loadRatingConfig(new URL("./missing-ratings.json", import.meta.url)))
      .rejects.toMatchObject({ code: "ENOENT" });
  });
});
