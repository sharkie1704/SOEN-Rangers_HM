import { describe, expect, it } from "vitest";
import { distance, rankCouriers, type CourierCandidate } from "../DispatchRule.ts";

const sweetSpot = { lat: 45.5131, lng: -73.5683 };
const courier = (courierId: string, lat: number, lng: number): CourierCandidate => ({ courierId, position: { lat, lng } });
const ids = (ranked: CourierCandidate[]) => ranked.map((candidate) => candidate.courierId);

describe("distance", () => {
  it("is the straight line between the two points", () => {
    expect(distance({ lat: 0, lng: 0 }, { lat: 3, lng: 4 })).toBe(5);
  });

  it("treats a degree of latitude and of longitude the same, as the grid rule says", () => {
    expect(distance(sweetSpot, { lat: sweetSpot.lat + 0.01, lng: sweetSpot.lng }))
      .toBeCloseTo(distance(sweetSpot, { lat: sweetSpot.lat, lng: sweetSpot.lng + 0.01 }), 12);
  });
});

describe("rankCouriers", () => {
  it("puts the nearest courier first", () => {
    const ranked = rankCouriers(sweetSpot, [
      courier("far", 45.5017, -73.5673),
      courier("near", 45.5125, -73.5690),
      courier("middle", 45.5161, -73.5713),
    ]);
    expect(ids(ranked)).toEqual(["near", "middle", "far"]);
  });

  it.each([
    [["b-courier", "a-courier"]],
    [["a-courier", "b-courier"]],
  ])("breaks a tie by the lowest courier ID, whatever the input order (%j)", (order) => {
    const positions: Record<string, CourierCandidate> = {
      "a-courier": courier("a-courier", 45.5131, -73.5713),
      "b-courier": courier("b-courier", 45.5131, -73.5653),
    };
    expect(ids(rankCouriers(sweetSpot, order.map((id) => positions[id])))).toEqual(["a-courier", "b-courier"]);
  });

  it("compares IDs by code unit, not by locale or number", () => {
    const ranked = rankCouriers(sweetSpot, [
      courier("c10", 45.5131, -73.5713),
      courier("c2", 45.5131, -73.5713),
      courier("C3", 45.5131, -73.5713),
    ]);
    expect(ids(ranked)).toEqual(["C3", "c10", "c2"]);
  });

  it("still sees a tie when floating-point rounding makes equal distances differ slightly", () => {
    const east = courier("b-courier", 45.5131, -73.5643);
    const west = courier("a-courier", 45.5131, -73.5723);
    expect(distance(sweetSpot, east.position)).not.toBe(distance(sweetSpot, west.position));
    expect(ids(rankCouriers(sweetSpot, [east, west]))).toEqual(["a-courier", "b-courier"]);
  });

  it("does not treat a real difference as a tie", () => {
    const ranked = rankCouriers(sweetSpot, [courier("a-courier", 45.5131, -73.5714), courier("b-courier", 45.5131, -73.5713)]);
    expect(ids(ranked)).toEqual(["b-courier", "a-courier"]);
  });

  it("returns nothing when there are no candidates, and leaves the input untouched", () => {
    expect(rankCouriers(sweetSpot, [])).toEqual([]);
    const input = [courier("far", 45.6, -73.6), courier("near", 45.5131, -73.5684)];
    rankCouriers(sweetSpot, input);
    expect(ids(input)).toEqual(["far", "near"]);
  });
});
