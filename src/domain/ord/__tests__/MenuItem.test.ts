import { describe, it, expect } from "vitest";
import { MenuItem } from "../MenuItem.ts";

const base = {
  id: 1,
  restaurantId: "rest-a",
  name: "Brownie",
  description: "",
  imageUrl: "",
  priceCents: 450,
  available: true,
};

describe("MenuItem invariants", () => {
  it("trims the name", () => {
    expect(new MenuItem({ ...base, name: "  Brownie  " }).name).toBe("Brownie");
  });

  it.each([
    ["empty name", { ...base, name: "   " }],
    ["zero price", { ...base, priceCents: 0 }],
    ["negative price", { ...base, priceCents: -5 }],
    ["fractional cents", { ...base, priceCents: 4.5 }],
  ])("rejects %s", (_label, props) => {
    expect(() => new MenuItem(props)).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
  });

  it("keeps the old price when a change is invalid", () => {
    const item = new MenuItem(base);
    expect(() => item.changePrice(-1)).toThrow();
    expect(item.priceCents).toBe(450);
  });

  it("keeps the old name when a rename is invalid", () => {
    const item = new MenuItem(base);
    expect(() => item.rename(" ")).toThrow();
    expect(item.name).toBe("Brownie");
  });
});

describe("MenuItem availability", () => {
  it("reports a real change", () => {
    const item = new MenuItem(base);
    expect(item.setAvailable(false)).toBe(true);
    expect(item.available).toBe(false);
  });

  it("reports no change when already in that state", () => {
    const item = new MenuItem(base);
    expect(item.setAvailable(true)).toBe(false);
  });
});
