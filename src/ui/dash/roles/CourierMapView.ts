import type { RoleMapViewBuilder } from "./RoleMapView";

export const buildCourierMapView: RoleMapViewBuilder = ({ user, restaurants, couriers }) => ({
  restaurants,
  couriers,
  highlightedCourierId: user.id, // assumes MapCourier.id === session user id
  panelFor: () => "public",     // the courier's order lives in CourierOrderPanel
});