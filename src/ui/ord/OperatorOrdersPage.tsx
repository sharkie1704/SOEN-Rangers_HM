import { Fragment, useEffect, useState } from "react";
import type { OrderDTO } from "../../application/ord/OrderDTO.ts";
import { api, ApiError } from "../reg/api/client";
import "./operator-orders.css";

// Dates arrive as strings in the JSON response.
type OperatorOrder = Omit<OrderDTO, "placedAt" | "events"> & {
  placedAt: string;
  events: readonly (Omit<OrderDTO["events"][number], "occurredAt"> & { occurredAt: string })[];
};
type OrderFilter = "all" | "active" | "delivered" | "cancelled-rejected";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OperatorOrdersPage() {
  const [orders, setOrders] = useState<OperatorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const filteredOrders = orders.filter((order) => {
    if (filter === "active") {
      return ["Placed", "Accepted", "Preparing", "Ready", "PickedUp"].includes(order.status);
    }
    if (filter === "delivered") return order.status === "Delivered";
    if (filter === "cancelled-rejected") return order.status === "Cancelled" || order.status === "Rejected";
    return true;
  });

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

    loadOrders();
    return () => { cancelled = true; };
  }, [refreshCount]);

  return (
    <section className="operator-orders" aria-labelledby="operator-orders-heading">
      <header className="operator-orders__heading">
        <div>
          <h1 id="operator-orders-heading">All Orders</h1>
          <p>Orders across all restaurants and customers.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => setRefreshCount((count) => count + 1)}>
          Refresh orders
        </button>
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
              <tr><td colSpan={4}>{filter === "all" ? "No orders yet." : "No orders match the selected filter."}</td></tr>
            ) : filteredOrders.map((order) => (
              <Fragment key={order.id}>
                <tr>
                  <th scope="row">#{order.id}</th>
                  <td>{order.restaurantName}</td>
                  <td>{order.status}</td>
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
                        <h2>Order #{order.id} — {order.restaurantName}</h2>
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
                                {event.occurredAt && <> — <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time></>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
