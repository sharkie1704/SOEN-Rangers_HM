import type { MapRestaurant } from "../MapView";
import type { RoleMapView } from "../roles";
import PublicRestaurantPanel from "./PublicRestaurantPanel";
import CustomerRestaurantPanel from "./CustomerRestaurantPanel";
import StaffRestaurantPanel from "./StaffRestaurantPanel";
import OperatorRestaurantPanel from "./OperatorRestaurantPanel";
import type { CommandItem, PanelOrder } from "./PanelTypes";

interface Props {
  restaurant: MapRestaurant;
  view: RoleMapView;
  orders: PanelOrder[];
  commands: CommandItem[];
  onCommand: (name: string) => void;
}

export default function RestaurantDetails({ restaurant, view, orders, commands, onCommand }: Props) {
  switch (view.panelFor(restaurant.id)) {
    case "customer":
      return <CustomerRestaurantPanel restaurant={restaurant} commands={commands} onCommand={onCommand} />;
    case "staff":
      return <StaffRestaurantPanel restaurant={restaurant} orders={orders} commands={commands} onCommand={onCommand} />;
    case "operator":
      return <OperatorRestaurantPanel restaurant={restaurant} orders={orders} commands={commands} onCommand={onCommand} />;
    default:
      return <PublicRestaurantPanel restaurant={restaurant} />;
  }
}