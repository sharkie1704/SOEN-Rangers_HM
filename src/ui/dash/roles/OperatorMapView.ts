import type { RoleMapViewBuilder } from "./RoleMapView";

export const buildOperatorMapView: RoleMapViewBuilder = ({ restaurants, couriers }) => ({
  restaurants,
  couriers,
  panelFor: () => "operator",
});