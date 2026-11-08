import type { MapRestaurant } from "../MapView";
import PublicRestaurantPanel from "./PublicRestaurantPanel";
import CommandButtons from "./CommandButtons";
import type { CommandItem, PanelOrder } from "./PanelTypes";

interface Props {
  restaurant: MapRestaurant;
  orders: PanelOrder[]; // operator may see all orders
  commands: CommandItem[]; // pause/reopen, reassign stalled order
  onCommand: (name: string) => void;
}

export default function OperatorRestaurantPanel({ restaurant, orders, commands, onCommand }: Props) {
  return (
    <>
      <PublicRestaurantPanel restaurant={restaurant} />
      <div className="panel__section">
        <h3>All orders</h3>
        {orders.length === 0 ? (
          <p className="panel__empty">No orders</p>
        ) : (
          <ul className="panel__orders">
            {orders.map((o) => (
              <li key={o.id}><span>{o.id}</span><span>{o.state}</span></li>
            ))}
          </ul>
        )}
      </div>
      <div className="panel__section">
        <h3>Operator actions</h3>
        <CommandButtons commands={commands} onCommand={onCommand} />
      </div>
    </>
  );
}