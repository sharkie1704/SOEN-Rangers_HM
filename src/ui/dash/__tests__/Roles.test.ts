// testing the role map view builder, which is a pure function that returns a view object
import { describe, it, expect } from "vitest";
import { buildRoleMapView, type SessionUser } from "../roles/index";
import type { MapRestaurant, MapCourier } from "../MapView";

const restaurants: MapRestaurant[] = [
  { id: "r1", name: "Demo Bakery", lat: 45.4973, lng: -73.5789, status: "OPEN", queue: { length: 1 } },
  { id: "r2", name: "Sweet Spot", lat: 45.5131, lng: -73.5683, status: "OPEN", queue: { length: 4 } },
];
const couriers: MapCourier[] = [
  { id: "c1", name: "Demo Courier", lat: 45.5, lng: -73.57, status: "IDLE" },
];

const ctx = (user: SessionUser) => ({ user, restaurants, couriers });

describe("role map views", () => {
  it("staff: full panel only for their own restaurant", () => {
    const v = buildRoleMapView("RESTAURANT")(
      ctx({ id: "u1", name: "Staff", role: "RESTAURANT", restaurantId: "r1" }),
    );
    expect(v.panelFor("r1")).toBe("staff");
    expect(v.panelFor("r2")).toBe("public");
    expect(v.highlightedRestaurantId).toBe("r1");
  });

  it("customer: gets a delivery pin and the customer panel", () => {
    const v = buildRoleMapView("CUSTOMER")(
      ctx({ id: "u2", name: "Cust", role: "CUSTOMER", deliveryLat: 45.5, deliveryLng: -73.56 }),
    );
    expect(v.deliveryPin).toEqual({ lat: 45.5, lng: -73.56 });
    expect(v.panelFor("r2")).toBe("customer");
  });

  it("customer without an address has no pin", () => {
    const v = buildRoleMapView("CUSTOMER")(ctx({ id: "u3", name: "Cust", role: "CUSTOMER" }));
    expect(v.deliveryPin).toBeUndefined();
  });

  it("courier: own marker highlighted, restaurants show public panel", () => {
    const v = buildRoleMapView("COURIER")(ctx({ id: "c1", name: "Courier", role: "COURIER" }));
    expect(v.highlightedCourierId).toBe("c1");
    expect(v.panelFor("r1")).toBe("public");
  });

  it("operator: operator panel everywhere, nothing highlighted", () => {
    const v = buildRoleMapView("OPERATOR")(ctx({ id: "u4", name: "Op", role: "OPERATOR" }));
    expect(v.panelFor("r1")).toBe("operator");
    expect(v.panelFor("r2")).toBe("operator");
    expect(v.highlightedRestaurantId).toBeUndefined();
  });
});