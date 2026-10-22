import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";

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
    api<{ orders: Order[] }>("/api/orders")
      .then(({ orders: result }) => setOrders(result))
      .catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : "Could not load your orders."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section aria-label="Order history" style={{ maxWidth: 900, margin: "24px auto", padding: 20 }}>
      <h2>Your orders</h2>
      {loading && <p>Loading your orders…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && orders.length === 0 && <p>You have not placed any orders yet.</p>}
      <div style={{ display: "grid", gap: 16 }}>
        {orders.map((order) => (
          <article key={order.id} style={{ border: "1px solid #C89F7A", borderRadius: 12, padding: 18, background: "#FFF9F2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong>Order #{order.id}</strong>
              <strong>Status: {order.status}</strong>
            </div>
            <p>Placed {new Date(order.placedAt).toLocaleString()}</p>
            <ul>{order.lines.map((line, index) => <li key={`${line.name}-${index}`}>{line.quantity} × {line.name}</li>)}</ul>
            <p>Total: ${(order.totalCents / 100).toFixed(2)}</p>
            <p>Events: {order.events.map((event) => `${event.action} #${event.eventId}`).join(" · ")}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" disabled={busyOrderId === order.id} onClick={() => refreshOrder(order.id)}>
                {busyOrderId === order.id ? "Updating…" : "Refresh status"}
              </button>
              {order.status === "Placed" && <button type="button" disabled={busyOrderId === order.id} onClick={() => cancelOrder(order.id)}>
                Cancel order
              </button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
