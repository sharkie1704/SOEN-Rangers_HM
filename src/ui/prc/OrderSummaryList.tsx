import { useId, useState } from "react";
import { api } from "../reg/api/client";
import { errorMessage, useApi } from "../reg/api/useApi";
import "./order-summaries.css";

export type Summary = {
  orderId: number;
  restaurantName: string;
  lines: { name: string; quantity: number; unitPriceCents?: number }[];
  fare?: {
    subtotalCents: number;
    deliveryFeeCents: number;
    serviceFeeCents: number;
    smallOrderSurchargeCents: number;
    totalCents: number;
  };
  placedAt: string;
  deliveredAt: string;
  generatedAt: string;
  ledger?: {
    finalState: string;
    epoch: number;
    eventId: number;
    totalChargeCents: number | null;
  };
};

export type HistoryRecord = Omit<Summary, "deliveredAt" | "generatedAt"> & {
  deliveredAt: string | null;
  generatedAt: string | null;
};

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function SummaryDetails({ summary }: { summary: HistoryRecord }) {
  return (
    <article className="order-summary">
      <header className="order-summary__header">
        <div>
          <p>{summary.generatedAt ? "ORDER SUMMARY" : "DELIVERY RECORD"}</p>
          <h3>Order #{summary.orderId}</h3>
        </div>
        <strong>{summary.restaurantName}</strong>
      </header>
      <dl className="order-summary__times">
        <div><dt>Placed</dt><dd>{new Date(summary.placedAt).toLocaleString()}</dd></div>
        <div><dt>Delivered</dt><dd>{summary.deliveredAt ? new Date(summary.deliveredAt).toLocaleString() : "Unavailable"}</dd></div>
        {summary.generatedAt && <div><dt>Summary created</dt><dd>{new Date(summary.generatedAt).toLocaleString()}</dd></div>}
      </dl>
      <h4>Items</h4>
      <ul className="order-summary__lines">
        {summary.lines.map((line, index) => (
          <li key={`${line.name}-${index}`}>
            <span>{line.quantity} × {line.name}</span>
            {line.unitPriceCents !== undefined && <span>{money(line.quantity * line.unitPriceCents)}</span>}
          </li>
        ))}
      </ul>
      {summary.fare && <dl className="order-summary__fare">
        <div><dt>Subtotal</dt><dd>{money(summary.fare.subtotalCents)}</dd></div>
        <div><dt>Delivery fee</dt><dd>{money(summary.fare.deliveryFeeCents)}</dd></div>
        <div><dt>Service fee</dt><dd>{money(summary.fare.serviceFeeCents)}</dd></div>
        <div><dt>Small-order surcharge</dt><dd>{money(summary.fare.smallOrderSurchargeCents)}</dd></div>
        <div className="order-summary__total"><dt>Total charged</dt><dd>{money(summary.fare.totalCents)}</dd></div>
      </dl>}
    </article>
  );
}

interface OrderSummaryListProps {
  operatorView?: boolean;
  restaurantView?: boolean;
  courierView?: boolean;
}

export default function OrderSummaryList({ operatorView = false, restaurantView = false, courierView = false }: OrderSummaryListProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const refundDescriptionId = useId();
  const detailsId = useId();
  const historyEndpoint = courierView ? "/api/couriers/me/history" : "/api/order-summaries";
  const {
    data,
    loading,
    error,
    setError,
    reload: loadSummaries,
  } = useApi(() => api<{ summaries: HistoryRecord[] }>(historyEndpoint), "Could not load order summaries.", [historyEndpoint]);
  const summaries = data?.summaries ?? [];
  const courierRating = useApi(
    () => api<{ scale: { min: number; max: number }; rating: { average: number; count: number } | null }>("/api/couriers/me/rating"),
    "Could not load courier rating.",
    [courierView],
  );
  const [message, setMessage] = useState("");
  const [refundingOrderId, setRefundingOrderId] = useState<number | null>(null);

  async function refundOrder(orderId: number) {
    if (!window.confirm(`Refund order #${orderId}? This action cannot be undone.`)) return;
    setRefundingOrderId(orderId);
    setError("");
    setMessage("");
    try {
      await api(`/api/orders/${orderId}/refund`, { method: "POST" });
      setMessage(`Order #${orderId} refunded successfully.`);
      loadSummaries();
    } catch (cause) {
      setError(errorMessage(cause, "Could not refund the order."));
    } finally {
      setRefundingOrderId(null);
    }
  }

  return (
    <section className={`order-summaries${operatorView ? " order-summaries--operator" : ""}`} aria-label="Delivered order summaries">
      <header className="order-summaries__heading">
        <p className="order-summaries__eyebrow">PRICING & HISTORY</p>
        <h2>{courierView ? "Delivery history" : restaurantView ? "Restaurant order history" : "Delivered order summaries"}</h2>
        <p>{courierView ? "Orders delivered by your courier account." : "Final charges are saved from the time each order was placed."}</p>
        {courierView && <p className="order-summaries__rating" aria-live="polite">
          Average rating: {courierRating.loading ? "Loading…" : courierRating.error ? "Unavailable" : courierRating.data?.rating
            ? `${courierRating.data.rating.average.toFixed(1)} ★ (${courierRating.data.rating.count} ${courierRating.data.rating.count === 1 ? "rating" : "ratings"})`
            : "No ratings yet"}
        </p>}
        <button type="button" onClick={loadSummaries} disabled={loading}>
          {loading ? "Loading…" : "Refresh summaries"}
        </button>
      </header>

      {loading && <p role="status">Loading order summaries…</p>}
      {error && <p className="order-summaries__error" role="alert">{error}</p>}
      {message && <p className="order-summaries__message" role="status">{message}</p>}
      {!operatorView && !loading && !error && summaries.length === 0 && (
        <p className="order-summaries__empty">No order history yet.</p>
      )}

      {operatorView ? (
        !loading && !error && (
          <>
            {summaries.length > 0 && (
              <p id={refundDescriptionId} className="order-summaries__refund-note">
                Only delivered orders can be refunded, and each order can be refunded once.
              </p>
            )}
            <div className="order-summaries__table-wrap" role="region" aria-label="Delivered order table" tabIndex={0}>
              <table className="order-summaries__table" aria-label="Delivered orders">
                <thead>
                  <tr>
                    <th scope="col">Order ID</th>
                    <th scope="col">Status</th>
                    <th scope="col">Total</th>
                    <th scope="col">Ledger</th>
                    <th scope="col">Details</th>
                    <th scope="col">Refund</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="order-summaries__empty">No delivered orders yet.</td>
                    </tr>
                  )}
                  {summaries.map((summary) => (
                    <tr key={summary.orderId}>
                      <th scope="row">#{summary.orderId}</th>
                      <td>{summary.ledger?.finalState ?? "Delivered"}</td>
                      <td>{summary.fare ? money(summary.fare.totalCents) : "Hidden"}</td>
                      <td>{summary.ledger ? `${summary.ledger.finalState} · #${summary.ledger.eventId}` : "Not recorded"}</td>
                      <td>
                        <div className="order-summaries__table-actions">
                          <button
                            type="button"
                            aria-label={`${expandedOrderId === summary.orderId ? "Hide" : "View"} details for order #${summary.orderId}`}
                            aria-expanded={expandedOrderId === summary.orderId}
                            aria-controls={`${detailsId}-${summary.orderId}`}
                            onClick={() => setExpandedOrderId((current) => current === summary.orderId ? null : summary.orderId)}
                          >
                            {expandedOrderId === summary.orderId ? "Hide Details" : "View Details"}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="order-summaries__table-actions">
                          <button
                            type="button"
                            disabled={summary.ledger?.finalState === "Refunded" || refundingOrderId !== null}
                            aria-describedby={refundDescriptionId}
                            onClick={() => void refundOrder(summary.orderId)}
                          >
                            {refundingOrderId === summary.orderId ? "Refunding…" : summary.ledger?.finalState === "Refunded" ? "Refunded" : "Refund"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {summaries.map((summary) => expandedOrderId === summary.orderId && (
              <div
                className="order-summaries__expanded-detail"
                id={`${detailsId}-${summary.orderId}`}
                key={summary.orderId}
              >
                <SummaryDetails summary={summary} />
              </div>
            ))}
          </>
        )
      ) : (
        <div className="order-summaries__list">
          {summaries.map((summary) => (
            <SummaryDetails summary={summary} key={summary.orderId} />
          ))}
        </div>
      )}
    </section>
  );
}
