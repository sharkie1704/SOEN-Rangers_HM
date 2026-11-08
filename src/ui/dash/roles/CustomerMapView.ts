import type { RoleMapViewBuilder } from "./RoleMapView";

export const buildCustomerMapView: RoleMapViewBuilder = ({ user, restaurants, couriers }) => ({
  restaurants,
  couriers,
  deliveryPin:
    user.deliveryLat != null && user.deliveryLng != null
      ? { lat: user.deliveryLat, lng: user.deliveryLng }
      : undefined,
  panelFor: () => "customer",
});