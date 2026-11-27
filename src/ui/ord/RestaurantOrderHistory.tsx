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
  const restaurantRatings = useApi(
    () => api<{
      scale: { min: number; max: number };
      average: number | null;
      count: number;
      ratings: { orderId: number; restaurantScore: number; createdAt: string }[];
    }>(`/api/restaurants/${encodeURIComponent(restaurantId)}/ratings`),
    "Could not load restaurant ratings.",
    [restaurantId],
  );
  const orders = data?.orders ?? [];

  return (
    <section className="my-orders-page restaurant-order-history" aria-label="Restaurant history">
      <header className="my-orders-heading">
        <h1>Restaurant history</h1>
        <div role="group" aria-label="History view">
          <button type="button" aria-pressed={view === "orders"} onClick={() => setView("orders")}>All orders</button>
          <button type="button" aria-pressed={view === "summaries"} onClick={() => setView("summaries")}>Delivered summaries</button>
        </div>
      </header>
      {view === "summaries" ? <OrderSummaryList restaurantView /> : (
        <>
          <button
            className="restaurant-history-refresh"
            type="button"
            disabled={loading || restaurantRatings.loading}
            onClick={() => { reload(); restaurantRatings.reload(); }}
          >Refresh orders and ratings</button>
          <section className="restaurant-history-ratings" aria-label="Restaurant ratings">
            <header>
              <h2>Ratings received</h2>
              {restaurantRatings.data?.average !== null && restaurantRatings.data?.average !== undefined && (
                <p aria-label={`Average rating ${restaurantRatings.data.average.toFixed(1)} out of ${restaurantRatings.data.scale.max}`}>
                  ★ {restaurantRatings.data.average.toFixed(1)} / {restaurantRatings.data.scale.max}
                  <span> ({restaurantRatings.data.count} {restaurantRatings.data.count === 1 ? "rating" : "ratings"})</span>
                </p>
              )}
            </header>
            {restaurantRatings.loading && <p role="status">Loading ratings…</p>}
            {restaurantRatings.error && <p role="alert">{restaurantRatings.error}</p>}
            {!restaurantRatings.loading && !restaurantRatings.error && restaurantRatings.data?.count === 0 && <p>No ratings received yet.</p>}
            {!restaurantRatings.loading && !restaurantRatings.error && restaurantRatings.data?.ratings.map((rating) => (
              <p className="restaurant-history-rating" key={rating.orderId}>
                <span>Order #{rating.orderId}</span>
                <strong aria-label={`Rated ${rating.restaurantScore} out of ${restaurantRatings.data?.scale.max}`}>
                  ★ {rating.restaurantScore} / {restaurantRatings.data?.scale.max ?? 5}
                </strong>
                <time dateTime={rating.createdAt}>{new Date(rating.createdAt).toLocaleDateString()}</time>
              </p>
            ))}
          </section>
          {loading && <p role="status">Loading restaurant history…</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && orders.length === 0 && <p>No restaurant orders yet.</p>}
          {!loading && !error && <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-heading"><h2>Order #{order.id}</h2><strong>{order.status}</strong></div>
                <div className="restaurant-history-order-body">
                  <p>Placed {new Date(order.placedAt).toLocaleString()}</p>
                  <ul>{order.lines.map((line) => <li key={line.menuItemId}>{line.quantity} × {line.name}</li>)}</ul>
                  <p>Item subtotal: ${(order.totalCents / 100).toFixed(2)}</p>
                  {order.status === "Delivered" && order.fare && <p>Saved final charge: ${(order.fare.totalCents / 100).toFixed(2)}</p>}
                  {order.status === "Delivered" && !order.fare && <p>Historical final charge unavailable.</p>}
                  {order.status === "Refunded" && <p>Refunded. The original delivery charge is preserved in Delivered summaries.</p>}
                  {order.status === "Rejected" && order.rejectionReason && <p>Rejection reason: {order.rejectionReason}</p>}
                </div>
              </article>
            ))}
          </div>}
        </>
      )}
    </section>
  );
}
