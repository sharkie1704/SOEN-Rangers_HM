import { useState } from "react";
import type { OrderDTO } from "../../application/ord/OrderDTO.ts";
import { api } from "../reg/api/client";
import { useApi } from "../reg/api/useApi";
import OrderSummaryList from "../prc/OrderSummaryList";
import "./customer-orders.css";

type HistoryOrder = Pick<OrderDTO, "id" | "status" | "lines" | "totalCents" | "fare" | "rejectionReason"> & {
  placedAt: string;
};

export default function RestaurantOrderHistory({ restaurantId }: { restaurantId: string }) {
  const [view, setView] = useState<"orders" | "summaries">("orders");
  const { data, loading, error, reload } = useApi(
    () => api<{ orders: HistoryOrder[] }>(`/api/restaurants/${encodeURIComponent(restaurantId)}/orders/all`),
    "Could not load restaurant history.",
    [restaurantId],
  );
  const orders = data?.orders ?? [];

  return (
    <section className="my-orders-page" aria-label="Restaurant history">
      <header className="my-orders-heading">
        <h1>Restaurant history</h1>
        <div role="group" aria-label="History view">
          <button type="button" aria-pressed={view === "orders"} onClick={() => setView("orders")}>All orders</button>
          <button type="button" aria-pressed={view === "summaries"} onClick={() => setView("summaries")}>Delivered summaries</button>
        </div>
      </header>
      {view === "summaries" ? <OrderSummaryList restaurantView /> : (
        <>
          <button type="button" disabled={loading} onClick={reload}>Refresh orders</button>
          {loading && <p role="status">Loading restaurant history…</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && orders.length === 0 && <p>No restaurant orders yet.</p>}
          {!loading && !error && <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-heading"><h2>Order #{order.id}</h2><strong>{order.status}</strong></div>
                <p>Placed {new Date(order.placedAt).toLocaleString()}</p>
                <ul>{order.lines.map((line) => <li key={line.menuItemId}>{line.quantity} × {line.name}</li>)}</ul>
                <p>Item subtotal: ${(order.totalCents / 100).toFixed(2)}</p>
                {order.status === "Delivered" && order.fare && <p>Saved final charge: ${(order.fare.totalCents / 100).toFixed(2)}</p>}
                {order.status === "Delivered" && !order.fare && <p>Historical final charge unavailable.</p>}
                {order.status === "Refunded" && <p>Refunded. The original delivery charge is preserved in Delivered summaries.</p>}
                {order.status === "Rejected" && order.rejectionReason && <p>Rejection reason: {order.rejectionReason}</p>}
              </article>
            ))}
          </div>}
        </>
      )}
    </section>
  );
}
