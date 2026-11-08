import type { MapRestaurant } from "../MapView";
import PublicRestaurantPanel from "./PublicRestaurantPopup";
import type { PanelOrder } from "./PopupInfoTypes";

interface Props {
  restaurant: MapRestaurant;
  orders: PanelOrder[]; // operator may see all orders
}

export default function OperatorRestaurantPanel({ restaurant, orders }: Props) {
  const visibleOrders = orders.filter((order) => order.state.toLowerCase() !== "rejected");
  const stateCounts = visibleOrders.reduce<Record<string, number>>((counts, order) => {
    counts[order.state] = (counts[order.state] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <>
      <PublicRestaurantPanel restaurant={restaurant} />
      <div className="panel__section">
        <h3>All orders</h3>
        {visibleOrders.length === 0 ? (
          <p className="panel__empty">No orders</p>
        ) : (
          <>
            <p className="panel__order-counts">
              {stateCounts.Accepted ?? 0} Accepted | {stateCounts.Preparing ?? 0} Preparing | {stateCounts.Ready ?? 0} Ready
            </p>
            <ul className="panel__orders">
              {visibleOrders.map((o) => (
                <li key={o.id}><span>{o.id}</span> <span>{o.state}</span></li>
              ))}
            </ul>
          </>
        )}
      </div>
      
    </>
  );
}