import type { GeoPoint } from "../MapProjection";
import type { MapCourier, MapRestaurant } from "../MapView";

export type SessionRole = "CUSTOMER" | "RESTAURANT" | "COURIER" | "OPERATOR";

export interface SessionUser {
  id: string;
  name: string;
  role: SessionRole;
  restaurantId?: string; // staff
  deliveryLat?: number; // customer
  deliveryLng?: number;
}

export type PanelKind = "customer" | "staff" | "operator" | "public";

export interface MapContext {
  user: SessionUser;
  restaurants: MapRestaurant[];
  couriers: MapCourier[];
}

export interface RoleMapView {
  restaurants: MapRestaurant[];
  couriers: MapCourier[];
  highlightedRestaurantId?: string;
  highlightedCourierId?: string;
  deliveryPin?: GeoPoint;
  route?: readonly [GeoPoint, GeoPoint];
  // which drawer a click on this restaurant opens
  panelFor(restaurantId: string): PanelKind;
}

export type RoleMapViewBuilder = (ctx: MapContext) => RoleMapView;