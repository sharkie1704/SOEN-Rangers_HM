import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import "./customer-orders.css";

type Order = {
  id: number;
  restaurantId: string;
  status: string;
  placedAt: string;
  totalCents: number;
  lines: { name: string; quantity: number }[];
  events: { eventId: number; action: string; from: string; to: string; occurredAt: string }[];
};

export default function CustomerOrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [refreshingList, setRefreshingList] = useState(false);

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

  async function refreshOrder(orderId: number) {
    setBusyOrderId(orderId);
    setError("");
    try {
      const { order } = await api<{ order: Order }>(`/api/orders/${orderId}`);
      setOrders((current) => current.map((item) => item.id === order.id ? order : item));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not refresh this order.");
    } finally {
      setBusyOrderId(null);
    }
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

  return (
    <main className="my-orders-page" aria-label="My orders">
      <header className="my-orders-heading">
        <div>
          <p className="my-orders-eyebrow">YOUR DESSERTDASH</p>
          <h1>My Orders</h1>
          <p className="my-orders-subtitle">Track current orders and revisit every order you’ve placed.</p>
        </div>
        <button className="orders-refresh-all" type="button" onClick={refreshOrders} disabled={loading || refreshingList}>
          {refreshingList ? "Refreshing…" : "Refresh orders"}
        </button>
      </header>
      <div className="orders-count">{orders.length} {orders.length === 1 ? "order" : "orders"}</div>
      {loading && <div className="orders-message" role="status"><span className="orders-spinner" />Loading your orders…</div>}
      {error && <div className="orders-error" role="alert"><span>{error}</span><button type="button" onClick={refreshOrders}>Try again</button></div>}
      {!loading && !error && orders.length === 0 && (
        <section className="orders-empty">
          <span className="orders-empty-icon" aria-hidden="true">♡</span>
          <h2>No orders yet</h2>
          <p>Your placed, in progress, and cancelled orders will show up here.</p>
        </section>
      )}
      <div className="orders-list">
        {orders.map((order) => (
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
            <div className="order-card-total"><span>Order total</span><strong>${(order.totalCents / 100).toFixed(2)}</strong></div>
            <div className="order-events" aria-label="Order event IDs">
              {order.events.map((event) => <span key={event.eventId}>{event.action} <strong>#{event.eventId}</strong></span>)}
            </div>
            <div className="order-card-actions">
              <button className="order-action order-action-secondary" type="button" disabled={busyOrderId === order.id} onClick={() => refreshOrder(order.id)}>
                {busyOrderId === order.id ? "Updating…" : "Refresh status"}
              </button>
              {order.status === "Placed" && <button className="order-action order-action-cancel" type="button" disabled={busyOrderId === order.id} onClick={() => cancelOrder(order.id)}>
                Cancel order
              </button>}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
