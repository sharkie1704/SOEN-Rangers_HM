import type { RoleMapViewBuilder } from "./RoleMapView";

export const buildStaffMapView: RoleMapViewBuilder = ({ user, restaurants, couriers }) => ({
  restaurants,
  couriers,
  highlightedRestaurantId: user.restaurantId,
  // own restaurant: full panel; others: public info only (no orders or menus)
  panelFor: (id) => (id === user.restaurantId ? "staff" : "public"),
});