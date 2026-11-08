export interface Position {
  readonly lat: number;
  readonly lng: number;
}

export interface CourierCandidate {
  readonly courierId: string;
  readonly position: Position;
}

// Distances this close count as equal, so floating-point rounding can't break a tie
const TIE_TOLERANCE = 1e-9;

// Straight-line distance on the seeded lat/lng grid, as the fixed dispatch rule requires
export function distance(a: Position, b: Position): number {
  return Math.hypot(a.lat - b.lat, a.lng - b.lng);
}

// Nearest courier first; at equal distance, the lowest courier ID wins
export function rankCouriers(restaurant: Position, candidates: readonly CourierCandidate[]): CourierCandidate[] {
  return candidates
    .map((candidate) => ({ candidate, distance: distance(restaurant, candidate.position) }))
    .sort((a, b) => Math.abs(a.distance - b.distance) <= TIE_TOLERANCE
      ? compareIds(a.candidate.courierId, b.candidate.courierId)
      : a.distance - b.distance)
    .map(({ candidate }) => candidate);
}

// Plain code-unit order, so the result doesn't depend on the machine's locale
function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
