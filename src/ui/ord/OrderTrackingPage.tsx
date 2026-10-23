import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import { formatPrice, orderSummary, REFRESH_MS, type Order, type OrderStatus } from "./RestaurantConsolePage";
import "./button-interactions.css";

type OrderTrackingPageInputs = {
  onBack: () => void;
};

const statusText: Record<OrderStatus, string> = {
  Placed: "Waiting for the restaurant to respond",
  Accepted: "Accepted, waiting to be prepared",
  Preparing: "Being prepared",
  Ready: "Ready for pickup",
  Rejected: "Rejected by the restaurant",
  Cancelled: "Cancelled",
};

function badgeColors(status: OrderStatus) {
  if (status === "Ready") return { backgroundColor: "#DCEEDC", color: "#28633A" };
  if (status === "Rejected" || status === "Cancelled") return { backgroundColor: "#F2D8D5", color: "#923C32" };
  return { backgroundColor: "#FFF0CD", color: "#835900" };
}

export default function OrderTrackingPage({ onBack }: OrderTrackingPageInputs) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantNames, setRestaurantNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const res = await api<{ orders: Order[] }>("/api/orders");
      setOrders(res.orders);
      setError("");
    } catch {
      setError("Could not load your orders. Retrying...");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadOrders]);

  useEffect(() => {
    api<{ restaurants: { id: string; name: string }[] }>("/api/restaurants")
      .then((res) => setRestaurantNames(Object.fromEntries(res.restaurants.map((r) => [r.id, r.name]))))
      .catch(() => {}); // Names are a nicety; orders still show without them
  }, []);

  async function cancelOrder(order: Order) {
    try {
      await api(`/api/orders/${order.id}/cancel`, { method: "POST" });
      setMessage(`Order #${order.id} cancelled`);
    } catch (e) {
      setMessage(e instanceof ApiError ? `Error: ${e.message}` : "Error: request failed");
    }
    await loadOrders();
  }

  return (
    <main
      style={{
        backgroundColor: "#FFF9F2",
        minHeight: "100vh",
        padding: "40px 24px",
        boxSizing: "border-box",
        fontFamily: "'Poppins', sans-serif",
        color: "#4B3028",
      }}
    >
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <button
          type="button"
          className="interactive-button"
          onClick={onBack}
          style={{ background: "none", border: "none", color: "#C66B32", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, padding: 0, marginBottom: "32px" }}
        >
          ← Back to restaurants
        </button>

        <h1 style={{ fontSize: "32px", margin: "0 0 24px", textAlign: "center" }}>Your orders</h1>

        {loading && <p>Loading orders...</p>}
        {error && <p role="alert">{error}</p>}
        {message && <p role="status" style={{ fontWeight: 600 }}>{message}</p>}
        {!loading && !error && orders.length === 0 && <p style={{ textAlign: "center" }}>You haven't placed any orders yet.</p>}

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "16px" }}>
          {orders.map((order) => (
            <li key={order.id} style={{ backgroundColor: "#EADBC8", border: "1px solid #C89F7A", borderRadius: "14px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <strong>Order #{order.id}</strong>
                <span>{restaurantNames[order.restaurantId] ?? ""}</span>
                <span style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, ...badgeColors(order.status) }}>
                  {order.status}
                </span>
              </div>
              <p style={{ margin: "12px 0 4px" }}>{statusText[order.status]}</p>
              {order.rejectionReason && <p style={{ margin: "0 0 4px" }}>Reason: {order.rejectionReason}</p>}
              <p style={{ margin: "0 0 4px" }}>{orderSummary(order)}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                <strong>{formatPrice(order.totalCents)}</strong>
                {/* The restaurant hasn't responded yet, so the customer can still back out */}
                {order.status === "Placed" && (
                  <button
                    type="button"
                    className="interactive-button"
                    onClick={() => cancelOrder(order)}
                    style={{ padding: "8px 14px", backgroundColor: "transparent", color: "#923C32", border: "1px solid #923C32", borderRadius: "8px", fontFamily: "inherit", fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancel order
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
