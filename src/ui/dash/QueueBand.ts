import type { PreparationQueue } from "../../domain/ord/PreparationQueue.ts";
import type { Restaurant } from "../../domain/ord/Restaurant.ts";

export type Band = "short" | "building" | "long";

export const BUILDING_MIN = 3;
export const LONG_MIN = 6;

export const BAND_COLOURS: Record<Band, string> = {
  short: "#2e7d32",
  building: "#f9a825",
  long: "#c62828",
};

type QueueBandInput = Pick<Restaurant, "status"> & {
  queue: Pick<PreparationQueue, "length">;
};

export function queueBand(r: QueueBandInput): Band {
  if (r.status === "PAUSED" || r.queue.length >= LONG_MIN) return "long";
  if (r.queue.length >= BUILDING_MIN) return "building";
  return "short";
}