import { Fragment, useEffect, useMemo, useState } from "react";
import type { OrderDTO } from "../../application/ord/OrderDTO.ts";
import { api, ApiError } from "../reg/api/client";
import type { OperatorRestaurant } from "./OperatorRestaurantsPage";
import "./operator-orders.css";

type OperatorOrder = Omit<OrderDTO, "placedAt" | "events"> & {
  placedAt: string;
  events: readonly (Omit<OrderDTO["events"][number], "occurredAt"> & { occurredAt: string })[];
};
type OrderFilter = "all" | "active" | "delivered" | "cancelled-rejected";

type Props = {
  restaurants: readonly OperatorRestaurant[];
};

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function restaurantDisplayName(
  order: Pick<OperatorOrder, "restaurantId" | "restaurantName">,
  restaurants: readonly OperatorRestaurant[],
): string {
  const restaurant = restaurants.find((candidate) => candidate.id === order.restaurantId);
  if (restaurant) return restaurant.name;
  return order.restaurantName === order.restaurantId ? "Restaurant" : order.restaurantName;
}

export default function OperatorOrdersPage({ restaurants }: Props) {
  const [orders, setOrders] = useState<OperatorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return orders.filter((order) => {
      if (filter === "active" && !["Placed", "Accepted", "Preparing", "Ready", "PickedUp"].includes(order.status)) {
        return false;
      }
      if (filter === "delivered" && order.status !== "Delivered") return false;
      if (filter === "cancelled-rejected" && order.status !== "Cancelled" && order.status !== "Rejected") return false;
      if (!query) return true;

      return String(order.id).includes(query)
        || restaurantDisplayName(order, restaurants).toLocaleLowerCase().includes(query)
        || order.lines.some((line) => line.name.toLocaleLowerCase().includes(query));
    });
  }, [filter, orders, restaurants, search]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError("");
      try {
        const response = await api<{ orders: OperatorOrder[] }>("/api/orders/all");
        if (!cancelled) setOrders(response.orders);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Could not load orders. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOrders();
    return () => { cancelled = true; };
  }, [refreshCount]);

  useEffect(() => {
    const events = new EventSource("/api/command-events");
    events.addEventListener("command", () => setRefreshCount((count) => count + 1));
    return () => events.close();
  }, []);

  return (
    <section className="operator-orders" aria-labelledby="operator-orders-heading">
      <header className="operator-orders__heading">
        <div>
          <h1 id="operator-orders-heading">All Orders</h1>
          <p>Orders across all restaurants and customers.</p>
        </div>
        <label className="operator-orders__search">
          <span>Search orders</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Order number, restaurant, or item"
          />
        </label>
      </header>
      <div className="operator-orders__filters" role="group" aria-label="Filter orders by status">
        {([
          ["all", "All Orders"],
          ["active", "Active"],
          ["delivered", "Delivered"],
          ["cancelled-rejected", "Cancelled / Rejected"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => { setFilter(value); setExpandedOrderId(null); }}
          >
            {label}
          </button>
        ))}
        <button className="operator-orders__refresh" type="button" disabled={loading} onClick={() => setRefreshCount((count) => count + 1)}>
          Refresh orders
        </button>
      </div>
      {error && <p className="operator-orders__error" role="alert">{error}</p>}
      <div className="operator-orders__table-wrap" role="region" aria-label="All orders table" tabIndex={0}>
        <table className="operator-orders__table" aria-label="All orders" aria-busy={loading}>
          <thead>
            <tr>
              <th scope="col">Order ID</th>
              <th scope="col">Restaurant</th>
              <th scope="col">Status</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} role="status">Loading orders…</td></tr>
            ) : error ? (
              <tr><td colSpan={4}>Orders could not be loaded. Please try refreshing.</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  {orders.length === 0 ? "No orders yet." : "No orders match the selected filters."}
                </td>
              </tr>
            ) : filteredOrders.map((order) => {
              const restaurantName = restaurantDisplayName(order, restaurants);
              return (
                <Fragment key={order.id}>
                  <tr>
                    <th scope="row">#{order.id}</th>
                    <td>{restaurantName}</td>
                    <td><span className={`operator-orders__status operator-orders__status--${order.status.toLowerCase()}`}>{order.status}</span></td>
                    <td>
                      <button
                        type="button"
                        aria-expanded={expandedOrderId === order.id}
                        aria-controls={`operator-order-details-${order.id}`}
                        aria-label={`${expandedOrderId === order.id ? "Hide" : "View"} details for order #${order.id}`}
                        onClick={() => setExpandedOrderId((current) => current === order.id ? null : order.id)}
                      >
                        {expandedOrderId === order.id ? "Hide Details" : "View Details"}
                      </button>
                    </td>
                  </tr>
                  <tr id={`operator-order-details-${order.id}`} hidden={expandedOrderId !== order.id}>
                    <td colSpan={4}>
                      {expandedOrderId === order.id && (
                        <div className="operator-orders__details">
                          <h2>Order #{order.id} — {restaurantName}</h2>
                          <p>Status: {order.status}</p>
                          <h3>Ordered items</h3>
                          <ul>
                            {order.lines.map((line) => (
                              <li key={line.menuItemId}>
                                {line.name} — Quantity: {line.quantity}, unit price: {money(line.unitPriceCents)}
                              </li>
                            ))}
                          </ul>
                          <dl>
                            <div><dt>Item subtotal</dt><dd>{money(order.totalCents)}</dd></div>
                            {order.fare && (
                              <>
                                <div><dt>Delivery fee</dt><dd>{money(order.fare.deliveryFeeCents)}</dd></div>
                                <div><dt>Service fee</dt><dd>{money(order.fare.serviceFeeCents)}</dd></div>
                                <div><dt>Small-order surcharge</dt><dd>{money(order.fare.smallOrderSurchargeCents)}</dd></div>
                                <div><dt>Saved final charge</dt><dd>{money(order.fare.totalCents)}</dd></div>
                              </>
                            )}
                          </dl>
                          {!order.fare && <p>No saved fare breakdown is available for this order.</p>}
                          {order.rejectionReason && <p>Rejection reason: {order.rejectionReason}</p>}
                          <h3>Lifecycle events</h3>
                          {order.events.length === 0 ? <p>No lifecycle events recorded.</p> : (
                            <ul>
                              {order.events.map((event) => (
                                <li key={event.eventId}>
                                  {event.action}: {event.from} → {event.to}
                                  {event.occurredAt && (
                                    <> — <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time></>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
