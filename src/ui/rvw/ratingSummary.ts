export interface RestaurantRatingSummary {
  readonly average: number | null;
  readonly count: number;
}

export function formatRestaurantRating(
  summary: RestaurantRatingSummary,
): string {
  if (summary.average === null || summary.count === 0) return "No ratings yet";
  return `${summary.average.toFixed(1)} ★ (${summary.count} ${summary.count === 1 ? "rating" : "ratings"})`;
}
