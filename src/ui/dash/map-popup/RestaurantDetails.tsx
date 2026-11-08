import type { MapRestaurant } from "../MapView";
import type { RoleMapView } from "../roles";
import PublicRestaurantPanel from "./PublicRestaurantPopup";
import CustomerRestaurantPanel from "./CustomerRestaurantPopup";
import StaffRestaurantPanel from "./StaffRestaurantPopup";
import OperatorRestaurantPanel from "./OperatorRestaurantPopup";
import type { PanelOrder } from "./PopupInfoTypes";

interface Props {
  restaurant: MapRestaurant;
  view: RoleMapView;
  orders: PanelOrder[];
  onViewMenu: () => void;
}

export default function RestaurantDetails({ restaurant, view, onViewMenu, orders }: Props) {
  switch (view.panelFor(restaurant.id)) {
    case "customer":
      return (
        <CustomerRestaurantPanel
          restaurant={restaurant}
          status={restaurant.status}
          onViewMenu={onViewMenu}
        />
      );
    case "staff":
      return <StaffRestaurantPanel restaurant={restaurant} />;
    case "operator":
      return <OperatorRestaurantPanel restaurant={restaurant} orders={orders} />;
    default:
      return <PublicRestaurantPanel restaurant={restaurant} />;
  }
}