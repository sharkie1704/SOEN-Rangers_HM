import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import { BAND_COLOURS, queueBand, type Band } from "../dash/QueueBand";
import { page, row, input, primary, secondary } from "./MenuEditorPage";
import "./button-interactions.css";

export type OrderStatus = "Placed" | "Accepted" | "Preparing" | "Ready" | "PickedUp" | "Delivered" | "Rejected" | "Cancelled";

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

type RestaurantStatus = "OPEN" | "PAUSED" | "CLOSED";

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
  const [restaurantStatus, setRestaurantStatus] = useState<RestaurantStatus>("OPEN");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const loadOrders = useCallback(async () => {
    const path = `/api/restaurants/${encodeURIComponent(restaurantId)}/orders`;
    try {
      const [placed, queued, restaurant] = await Promise.all([
        api<{ orders: Order[] }>(`${path}/incoming`),
        api<{ orders: Order[] }>(`${path}/queue`),
        api<{ restaurant: { status: RestaurantStatus } }>(`/api/restaurants/${encodeURIComponent(restaurantId)}`),
      ]);
      setIncoming(placed.orders);
      setQueue(queued.orders);
      setRestaurantStatus(restaurant.restaurant.status);
      setError("");
    } catch {
      setError("Could not load orders. Retrying...");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadOrders();
    const events = new EventSource("/api/command-events");
    events.addEventListener("command", loadOrders);
    return () => events.close();
  }, [loadOrders]);

  async function act(order: Order, action: keyof typeof doneMessage, body?: unknown) {
    try {
      const { transition } = await api<{ transition: { order: Order; eventId: number } }>(`/api/orders/${order.id}/${action}`, { method: "POST", body });
      setMessage(`Order #${order.id} ${doneMessage[action]} (event #${transition.eventId})`);
      setRejectingId(null);
      setReason("");
    } catch (e) {
      setMessage(e instanceof ApiError ? `Error: ${e.message}` : "Error: request failed");
    }
    // Refresh either way: the queue may have moved, or the customer may have cancelled first
    await loadOrders();
  }

  const band: Band = queueBand({ status: restaurantStatus, queue });

  return (
    <section className="restaurant-orders-page" style={{ ...page, minHeight: "auto", paddingBottom: 0 }}>
      <div className="restaurant-orders-page__inner" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <header className="restaurant-orders-page__header">
          <div>
            <h2>Orders</h2>
            <p className="restaurant-orders-page__description">Review incoming orders and keep the kitchen queue moving.</p>
          </div>
          <div className="restaurant-orders-page__queue-band">
            <span>Queue band</span>
            <span
              aria-label={`${band} queue band`}
              style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: BAND_COLOURS[band] }}
            />
            <span style={{ textTransform: "capitalize" }}>{band}</span>
            <span>({queue.length})</span>
          </div>
        </header>

        {loading && <p>Loading orders...</p>}
        {error && <p className="error">{error}</p>}
        {message && <p className="restaurant-orders-page__message" role="status">{message}</p>}

        <section className="restaurant-orders-page__group" aria-labelledby="incoming-orders-heading">
          <div className="restaurant-orders-page__group-heading">
            <h3 id="incoming-orders-heading">Incoming orders</h3>
            <span className="restaurant-orders-page__count">{incoming.length}</span>
          </div>
          {!loading && incoming.length === 0 && <p className="restaurant-orders-page__empty">No new orders. You’re all caught up.</p>}
          <ul className="restaurant-orders-page__orders" style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: "8px" }}>
            {incoming.map((order) => (
              <li className="restaurant-orders-page__order" key={order.id}>
                {rejectingId === order.id ? (
                  <form className="restaurant-orders-page__order-content" onSubmit={(e) => { e.preventDefault(); act(order, "reject", { reason }); }} style={row}>
                    <strong className="restaurant-orders-page__order-id">#{order.id}</strong>
                    <label>Reason <input style={input} value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus /></label>
                    <button type="submit" className="interactive-button" style={primary}>Reject order</button>
                    <button type="button" className="interactive-button" style={secondary} onClick={() => setRejectingId(null)}>Back</button>
                  </form>
                ) : (
                  <div className="restaurant-orders-page__order-content" style={row}>
                    <strong className="restaurant-orders-page__order-id">#{order.id}</strong>
                    <span className="restaurant-orders-page__summary">{orderSummary(order)}</span>
                    <span className="restaurant-orders-page__price">{formatPrice(order.totalCents)}</span>
                    <span className="restaurant-orders-page__actions" style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                      <button className="interactive-button" style={primary} onClick={() => act(order, "accept")}>Accept</button>
                      <button className="interactive-button" style={secondary} onClick={() => { setRejectingId(order.id); setReason(""); }}>Reject</button>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="restaurant-orders-page__group restaurant-orders-page__group--queue" aria-labelledby="preparation-queue-heading">
          <div className="restaurant-orders-page__group-heading">
            <h3 id="preparation-queue-heading">Preparation queue</h3>
            <span className="restaurant-orders-page__count">{queue.length}</span>
          </div>
          {!loading && queue.length === 0 && <p className="restaurant-orders-page__empty">Nothing to prepare right now.</p>}
          <ol className="restaurant-orders-page__orders" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" }}>
            {queue.map((order) => (
              <li className="restaurant-orders-page__order" key={order.id}>
                <div className="restaurant-orders-page__order-content" style={row}>
                  <strong className="restaurant-orders-page__order-id">#{order.id}</strong>
                  <span className="restaurant-orders-page__summary">{orderSummary(order)}</span>
                  <span className={`restaurant-orders-page__status${order.status === "Preparing" ? " restaurant-orders-page__status--preparing" : ""}`}>
                    {order.status === "Preparing" ? "Preparing" : "Waiting"}
                  </span>
                  {/* Only the order at the front is being prepared, so only it can be marked ready */}
                  {order.status === "Preparing" && (
                    <button className="interactive-button" style={{ ...primary, marginLeft: "auto" }} onClick={() => act(order, "ready")}>
                      Mark ready
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}
