import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";

type Order = {
  id: number;
  restaurantId: string;
  status: string;
  placedAt: string;
  totalCents: number;
  lines: { name: string; quantity: number }[];
};

export default function CustomerOrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          </article>
        ))}
      </div>
    </section>
  );
}
