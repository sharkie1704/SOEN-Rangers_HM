import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { RatingScale } from "../../domain/rvw/Rating.ts";

// Bounds must fit the PostgreSQL Int columns that store the scores.
const score = z.number().int().positive().max(2_147_483_647);
const configSchema = z.strictObject({
  rating: z.strictObject({ min: score, max: score }).refine(
    ({ min, max }) => min <= max,
    { path: ["max"], message: "Rating maximum must be greater than or equal to the minimum." },
  ),
});

export function parseRatingConfig(contents: string): { readonly rating: RatingScale } {
  const input: unknown = JSON.parse(contents);
  return configSchema.parse(input);
}

export async function loadRatingConfig(
  path: URL = new URL("../../../config/ratings.json", import.meta.url),
) {
  return parseRatingConfig(await readFile(path, "utf8"));
}
