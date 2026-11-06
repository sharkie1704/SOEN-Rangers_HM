import { describe, it, expect } from 'vitest';
import { computeBounds, project } from '../MapProjection';

const pts = [
  { lat: 45.40, lng: -73.70 },
  { lat: 45.60, lng: -73.50 },
];

describe('computeBounds', () => {
  it('returns null for no points', () => {
    expect(computeBounds([])).toBeNull();
  });
  it('finds min and max on both axes', () => {
    expect(computeBounds(pts)).toEqual({
      minLat: 45.40, maxLat: 45.60, minLng: -73.70, maxLng: -73.50,
    });
  });
});

describe('project', () => {
  const b = computeBounds(pts)!;
  it('maps the south-west corner to bottom-left (with padding)', () => {
    expect(project(pts[0], b, 400, 300, 30)).toEqual({ x: 30, y: 270 });
  });
  it('maps the north-east corner to top-right (with padding)', () => {
    expect(project(pts[1], b, 400, 300, 30)).toEqual({ x: 370, y: 30 });
  });
  it('puts higher latitude at a smaller y', () => {
    expect(project(pts[1], b, 400, 300).y).toBeLessThan(project(pts[0], b, 400, 300).y);
  });
  it('centres a single point without NaN', () => {
    const one = [{ lat: 45.5, lng: -73.6 }];
    const r = project(one[0], computeBounds(one)!, 400, 300, 30);
    expect(r).toEqual({ x: 200, y: 150 });
  });
  it('handles points sharing a latitude', () => {
    const line = [{ lat: 45.5, lng: -73.7 }, { lat: 45.5, lng: -73.5 }];
    const r = project(line[0], computeBounds(line)!, 400, 300, 30);
    expect(Number.isFinite(r.x) && Number.isFinite(r.y)).toBe(true);
    expect(r.y).toBe(150);
  });
});