import { useState } from "react";
import { api } from "../reg/api/client";
import { errorMessage, useApi } from "../reg/api/useApi";
import type { Summary } from "../prc/OrderSummaryList";
import type { OrderDTO } from "../../application/ord/OrderDTO.ts";
import type { RatingScale } from "../../domain/rvw/Rating.ts";
import OrderRatingForm from "../rvw/OrderRatingForm";
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

type RatingState = { scale: RatingScale; ratedOrderIds: number[] };
type RatingFeedback = { saved: true } | { saved: false; message: string };

export default function CustomerOrderHistory() {
  const [section, setSection] = useState<"active" | "delivered" | "cancelled">("active");
  const summaryResource = useApi(
    () => api<{ summaries: Summary[] }>("/api/order-summaries"),
    "Could not load delivery summaries.",
  );
  const orderResource = useApi(
    () => api<{ orders: Order[] }>("/api/orders").then((result) => result.orders),
    "Could not load your orders.",
  );
  const ratingResource = useApi(
    () => api<RatingState>("/api/ratings/me"),
    "Could not load rating information.",
  );
  const [ratingFeedback, setRatingFeedback] = useState<Partial<Record<number, RatingFeedback>>>({});
  const summaries = summaryResource.data?.summaries ?? [];
  const { loading: summariesLoading, error: summaryError } = summaryResource;
  const orders = orderResource.data ?? [];
  const { error, setError, setData: setOrders } = orderResource;
  const loading = orderResource.loading && orderResource.data === undefined;
  const refreshingList = orderResource.loading && orderResource.data !== undefined;
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  function refreshHistory() {
    summaryResource.reload();
    orderResource.reload();
    ratingResource.reload();
  }

  async function cancelOrder(orderId: number) {
    setBusyOrderId(orderId);
    setError("");
    try {
      const { transition } = await api<{ transition: { order: Order } }>(`/api/orders/${orderId}/cancel`, { method: "POST" });
      setOrders((current) => current?.map((item) => item.id === orderId ? transition.order : item));
    } catch (cause) {
      setError(errorMessage(cause, "Could not cancel this order."));
    } finally {
      setBusyOrderId(null);
    }
  }

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
        {section === "delivered" && ratingResource.error && <p role="alert">{ratingResource.error}</p>}
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
            const rating = ratingResource.data;
            const feedback = ratingFeedback[order.id];
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
              {order.status === "Delivered" && (
                <>
                  {rating && !ratingResource.error && !rating.ratedOrderIds.includes(order.id) && !feedback && (
                    <OrderRatingForm
                      orderId={order.id}
                      scale={rating.scale}
                      onSaved={() => setRatingFeedback((current) => ({ ...current, [order.id]: { saved: true } }))}
                      onDuplicate={(message) => {
                        setRatingFeedback((current) => ({ ...current, [order.id]: { saved: false, message } }));
                        ratingResource.reload();
                      }}
                    />
                  )}
                  <div role="status">{feedback?.saved ? "Rating submitted. Thank you!" : null}</div>
                  {feedback && !feedback.saved && <p role="alert">{feedback.message}</p>}
                </>
              )}
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
