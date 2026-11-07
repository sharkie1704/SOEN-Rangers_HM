export interface GeoPoint { lat: number; lng: number; }
export interface Bounds { minLat: number; maxLat: number; minLng: number; maxLng: number; }
export interface PixelPoint { x: number; y: number; }

export function computeBounds(points: GeoPoint[]): Bounds | null {
  if (points.length === 0) return null;  // empty map 
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  return {
    minLat: Math.min(...lats), maxLat: Math.max(...lats),
    minLng: Math.min(...lngs), maxLng: Math.max(...lngs),
  };
}

// fraction of the way from min to max; 0.5 (centre) if min === max
function fraction(value: number, min: number, max: number): number {
  const span = max - min;
  return span === 0 ? 0.5 : (value - min) / span;
}

export function project(
  p: GeoPoint, b: Bounds, width: number, height: number, padding = 30,
): PixelPoint {
  const fx = fraction(p.lng, b.minLng, b.maxLng);
  const fy = fraction(p.lat, b.minLat, b.maxLat);
  return {
    x: padding + fx * (width - 2 * padding),
    y: padding + (1 - fy) * (height - 2 * padding),  // flip: north (high lat) is up
  };
}