import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import { page, row, input, primary, secondary } from "./MenuEditorPage";
import "./button-interactions.css";

export type OrderStatus = "Placed" | "Accepted" | "Preparing" | "Ready" | "Rejected" | "Cancelled";

export type Order = {
  id: number;
  restaurantId: string;
  status: OrderStatus;
  lines: { menuItemId: number; name: string; quantity: number; unitPriceCents: number }[];
  totalCents: number;
  placedAt: string;
  rejectionReason?: string;
};

type RestaurantConsolePageInputs = {
  restaurantId: string;
};

// New orders show up without a manual refresh
export const REFRESH_MS = 5000;

export function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export function orderSummary(order: Order): string {
  return order.lines.map((line) => `${line.quantity} × ${line.name}`).join(", ");
}

const doneMessage = { accept: "accepted", reject: "rejected", ready: "marked ready" };

export default function RestaurantConsolePage({ restaurantId }: RestaurantConsolePageInputs) {
  const [incoming, setIncoming] = useState<Order[]>([]);
  const [queue, setQueue] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const loadOrders = useCallback(async () => {
    const path = `/api/restaurants/${encodeURIComponent(restaurantId)}/orders`;
    try {
      const [placed, queued] = await Promise.all([
        api<{ orders: Order[] }>(`${path}/incoming`),
        api<{ orders: Order[] }>(`${path}/queue`),
      ]);
      setIncoming(placed.orders);
      setQueue(queued.orders);
      setError("");
    } catch {
      setError("Could not load orders. Retrying...");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadOrders]);

  async function act(order: Order, action: keyof typeof doneMessage, body?: unknown) {
    try {
      const res = await api<{ order: Order; eventId: number }>(`/api/orders/${order.id}/${action}`, { method: "POST", body });
      setMessage(`Order #${order.id} ${doneMessage[action]} (event #${res.eventId})`);
      setRejectingId(null);
      setReason("");
    } catch (e) {
      setMessage(e instanceof ApiError ? `Error: ${e.message}` : "Error: request failed");
    }
    // Refresh either way: the queue may have moved, or the customer may have cancelled first
    await loadOrders();
  }

  return (
    <section style={{ ...page, minHeight: "auto", paddingBottom: 0 }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "28px", margin: "0 0 16px" }}>Orders</h2>

        {loading && <p>Loading orders...</p>}
        {error && <p className="error">{error}</p>}
        {message && <p role="status" style={{ fontWeight: 600 }}>{message}</p>}

        <h3 style={{ margin: "0 0 8px" }}>Incoming ({incoming.length})</h3>
        {!loading && incoming.length === 0 && <p>No new orders.</p>}
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: "8px" }}>
          {incoming.map((order) => (
            <li key={order.id}>
              {rejectingId === order.id ? (
                <form onSubmit={(e) => { e.preventDefault(); act(order, "reject", { reason }); }} style={row}>
                  <strong>#{order.id}</strong>
                  <label>Reason <input style={input} value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus /></label>
                  <button type="submit" className="interactive-button" style={primary}>Reject order</button>
                  <button type="button" className="interactive-button" style={secondary} onClick={() => setRejectingId(null)}>Back</button>
                </form>
              ) : (
                <div style={row}>
                  <strong>#{order.id}</strong>
                  <span>{orderSummary(order)}</span>
                  <span>{formatPrice(order.totalCents)}</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                    <button className="interactive-button" style={primary} onClick={() => act(order, "accept")}>Accept</button>
                    <button className="interactive-button" style={secondary} onClick={() => { setRejectingId(order.id); setReason(""); }}>Reject</button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>

        <h3 style={{ margin: "0 0 8px" }}>Preparation queue ({queue.length})</h3>
        {!loading && queue.length === 0 && <p>Nothing to prepare.</p>}
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" }}>
          {queue.map((order) => (
            <li key={order.id} style={row}>
              <strong>#{order.id}</strong>
              <span>{orderSummary(order)}</span>
              <span style={{ fontWeight: 600, color: order.status === "Preparing" ? "#C66B32" : "#4B3028" }}>
                {order.status === "Preparing" ? "Preparing" : "Waiting"}
              </span>
              {/* Only the order at the front is being prepared, so only it can be marked ready */}
              {order.status === "Preparing" && (
                <button className="interactive-button" style={{ ...primary, marginLeft: "auto" }} onClick={() => act(order, "ready")}>
                  Mark ready
                </button>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
