// seen by staff of own restaurant only
import type { MapRestaurant } from "../MapView";
import PublicRestaurantPanel from "./PublicRestaurantPopup";

interface Props {
  restaurant: MapRestaurant;
}

export default function StaffRestaurantPanel({ restaurant }: Props) {
  return (
    <>
      <PublicRestaurantPanel restaurant={restaurant} />
      <div className="panel__section">
        {/* display something if we want, if not we can remove this file */}
      </div>
      
    </>
  );
}