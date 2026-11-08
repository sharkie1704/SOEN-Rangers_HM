// seen by staff of own restaurant only
import type { MapRestaurant } from "../MapView";
import PublicRestaurantPanel from "./PublicRestaurantPanel";
import CommandButtons from "./CommandButtons";
import type { CommandItem, PanelOrder } from "./PanelTypes";

interface Props {
  restaurant: MapRestaurant;
  orders: PanelOrder[]; // this restaurant's orders only
  commands: CommandItem[]; // accept, reject, mark ready, pause
  onCommand: (name: string) => void;
}

export default function StaffRestaurantPanel({ restaurant, orders, commands, onCommand }: Props) {
  return (
    <>
      <PublicRestaurantPanel restaurant={restaurant} />
      <div className="panel__section">
        <h3>Order queue</h3>
        {orders.length === 0 ? (
          <p className="panel__empty">No orders in the queue</p>
        ) : (
          <ul className="panel__orders">
            {orders.map((o) => (
              <li key={o.id}><span>{o.id}</span><span>{o.state}</span></li>
            ))}
          </ul>
        )}
      </div>
      <div className="panel__section">
        <h3>Actions</h3>
        <CommandButtons commands={commands} onCommand={onCommand} />
      </div>
    </>
  );
}