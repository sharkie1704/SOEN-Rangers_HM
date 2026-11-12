import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import type { Summary } from "../prc/OrderSummaryList";
import type { OrderDTO } from "../../application/ord/OrderDTO.ts";
import "./customer-orders.css";

type Order = {
  id: number;
  restaurantId: string;
  status: OrderDTO["status"];
  placedAt: string;
  totalCents: number;
  fare?: OrderDTO["fare"];
  lines: { name: string; quantity: number }[];
  events: { eventId: number; action: string; from: string; to: string; occurredAt: string }[];
  rejectionReason: string;
};

export default function CustomerOrderHistory() {
  const [section, setSection] = useState<"active" | "delivered" | "cancelled">("active");
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [summaryError, setSummaryError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [refreshingList, setRefreshingList] = useState(false);
  const [summariesLoading, setSummariesLoading] = useState(true);

  async function refreshOrders() {
    setRefreshingList(true);
    setError("");
    try {
      const { orders: result } = await api<{ orders: Order[] }>("/api/orders");
      setOrders(result);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load your orders.");
    } finally {
      setRefreshingList(false);
    }
  }

  function refreshHistory() {
    setRefreshCount((count) => count + 1);
    void refreshOrders();
  }

  async function cancelOrder(orderId: number) {
    setBusyOrderId(orderId);
    setError("");
    try {
      const { transition } = await api<{ transition: { order: Order } }>(`/api/orders/${orderId}/cancel`, { method: "POST" });
      setOrders((current) => current.map((item) => item.id === orderId ? transition.order : item));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not cancel this order.");
    } finally {
      setBusyOrderId(null);
    }
  }

  useEffect(() => {
    refreshOrders().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSummaryError("");
    setSummariesLoading(true);
    api<{ summaries: Summary[] }>("/api/order-summaries")
      .then((result) => { if (!cancelled) setSummaries(result.summaries); })
      .catch((cause) => { if (!cancelled) setSummaryError(cause instanceof ApiError ? cause.message : "Could not load delivery summaries."); })
      .finally(() => { if (!cancelled) setSummariesLoading(false); });
    return () => { cancelled = true; };
  }, [refreshCount]);

  const visibleOrders = orders.filter((order) => section === "delivered"
    ? order.status === "Delivered" || order.status === "Refunded"
    : section === "cancelled"
      ? order.status === "Cancelled" || order.status === "Rejected"
      : ["Placed", "Accepted", "Preparing", "Ready", "PickedUp"].includes(order.status));

  return (
    <main className="customer-order-history" aria-label="Customer order history">
      <section className="customer-history-content" aria-labelledby="my-orders-heading">
        <header className="my-orders-heading">
          <div>
            <p className="my-orders-eyebrow">YOUR DESSERTDASH</p>
            <h1 id="my-orders-heading">My Orders</h1>
            <p className="my-orders-subtitle">Track current orders and revisit every order you’ve placed.</p>
          </div>
          <button className="orders-refresh-all" type="button" onClick={refreshHistory} disabled={loading || refreshingList}>
            {refreshingList ? "Refreshing…" : "Refresh orders"}
          </button>
        </header>
        <div className="customer-history-filters" role="group" aria-label="Order history sections">
          {([ ["active", "Active"], ["delivered", "Delivered"], ["cancelled", "Cancelled/Rejected"] ] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={section === id} onClick={() => setSection(id)}>{label}</button>
          ))}
        </div>
        {section === "delivered" && summaryError && <p role="alert">{summaryError}</p>}
        <div className="orders-count">{visibleOrders.length} {visibleOrders.length === 1 ? "order" : "orders"}</div>
        {loading && <div className="orders-message" role="status"><span className="orders-spinner" />Loading your orders…</div>}
        {error && <div className="orders-error" role="alert"><span>{error}</span><button type="button" onClick={refreshHistory}>Try again</button></div>}
        {!loading && !error && visibleOrders.length === 0 && (
          <section className="orders-empty">
            <span className="orders-empty-icon" aria-hidden="true">♡</span>
            <h2>No orders in this section yet</h2>
            <p>Choose another section or refresh your orders.</p>
          </section>
        )}
        <div className="orders-list">
          {visibleOrders.map((order) => {
            const summary = summaries.find((item) => item.orderId === order.id);
            const completed = order.status === "Delivered" || order.status === "Refunded";
            const notCharged = order.status === "Cancelled" || order.status === "Rejected";
            let fareLabel = "Saved order total";
            if (!order.fare) fareLabel = "Final charge unavailable";
            else if (order.status === "Delivered") fareLabel = "Final charge";
            else if (order.status === "Refunded") fareLabel = "Original charge — refunded";
            if (notCharged && order.fare) fareLabel = "Original quoted total — not charged";
            return (
            <article className="order-card" key={order.id}>
              <div className="order-card-heading">
                <div>
                  <p className="order-number-label">ORDER</p>
                  <h2>#{order.id}</h2>
                </div>
                <span className={`order-status order-status-${order.status.toLowerCase()}`}>{order.status}</span>
              </div>
              <p className="order-placed-date">Placed {new Date(order.placedAt).toLocaleString()}</p>
              <ul className="order-lines">
                {order.lines.map((line, index) => <li key={`${line.name}-${index}`}><span>{line.quantity} × {line.name}</span></li>)}
              </ul>
              {order.fare ? (
                <dl className="customer-history-fare">
                  <div><dt>Items subtotal</dt><dd>${(order.fare.subtotalCents / 100).toFixed(2)}</dd></div>
                  <div><dt>Delivery fee</dt><dd>${(order.fare.deliveryFeeCents / 100).toFixed(2)}</dd></div>
                  <div><dt>Service fee</dt><dd>${(order.fare.serviceFeeCents / 100).toFixed(2)}</dd></div>
                  <div><dt>Small-order surcharge</dt><dd>${(order.fare.smallOrderSurchargeCents / 100).toFixed(2)}</dd></div>
                  <div className="customer-history-fare__total"><dt>{fareLabel}</dt><dd>${(order.fare.totalCents / 100).toFixed(2)}</dd></div>
                </dl>
              ) : <p>Final charge unavailable.</p>}
              {completed && (summary
                ? <details>
                    <summary>View delivery details</summary>
                    <dl className="customer-history-fare">
                      <div><dt>Restaurant</dt><dd>{summary.restaurantName}</dd></div>
                      <div><dt>Order ID</dt><dd>#{summary.orderId}</dd></div>
                      <div><dt>Placed</dt><dd>{new Date(summary.placedAt).toLocaleString()}</dd></div>
                      <div><dt>Delivered</dt><dd>{new Date(summary.deliveredAt).toLocaleString()}</dd></div>
                      <div><dt>Summary created</dt><dd>{new Date(summary.generatedAt).toLocaleString()}</dd></div>
                    </dl>
                  </details>
                : <p>{summariesLoading ? "Loading delivery summary…" : summaryError ? "Delivery summary could not be loaded." : "Delivery summary unavailable."}</p>)}
              {(order.status === "Placed" || order.status === "Rejected") && <div className="order-card-actions">
                {order.status === "Placed" && <button className="order-action order-action-cancel" type="button" disabled={busyOrderId === order.id} onClick={() => cancelOrder(order.id)}>
                  Cancel order
                </button>}
                {order.status === "Rejected" && (
                  <p className="order-comment order-rejection-reason">
                    <u style={{ marginRight: "4px" }}>Rejection Reason:</u>{" "} {order.rejectionReason || "No reason provided."}
                  </p>
                )}
              </div>}
            </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
