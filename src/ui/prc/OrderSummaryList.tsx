import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import "./order-summaries.css";

type Summary = {
  orderId: number;
  restaurantName: string;
  lines: { name: string; quantity: number; unitPriceCents: number }[];
  fare: {
    subtotalCents: number;
    deliveryFeeCents: number;
    serviceFeeCents: number;
    smallOrderSurchargeCents: number;
    totalCents: number;
  };
  placedAt: string;
  deliveredAt: string;
  generatedAt: string;
};

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrderSummaryList() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSummaries() {
    setLoading(true);
    setError("");
    try {
      const result = await api<{ summaries: Summary[] }>("/api/order-summaries");
      setSummaries(result.summaries);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load order summaries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialSummaries() {
      try {
        const result = await api<{ summaries: Summary[] }>("/api/order-summaries");
        if (!cancelled) setSummaries(result.summaries);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof ApiError ? cause.message : "Could not load order summaries.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialSummaries();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="order-summaries" aria-label="Delivered order summaries">
      <header className="order-summaries__heading">
        <p className="order-summaries__eyebrow">PRICING & HISTORY</p>
        <h2>Delivered order summaries</h2>
        <p>Final charges are saved from the time each order was placed.</p>
        <button type="button" onClick={loadSummaries} disabled={loading}>
          {loading ? "Loading…" : "Refresh summaries"}
        </button>
      </header>

      {loading && <p role="status">Loading order summaries…</p>}
      {error && <p className="order-summaries__error" role="alert">{error}</p>}
      {!loading && !error && summaries.length === 0 && (
        <p className="order-summaries__empty">No delivered order summaries yet.</p>
      )}

      {summaries.length > 0 && (
        <section className="order-summaries__console" aria-label="Order summary output console" aria-live="polite">
          <h3>Output console</h3>
          <ul>
            {summaries.map((summary) => (
              <li key={summary.orderId}>
                [{new Date(summary.generatedAt).toLocaleString()}] PRC created summary for order #{summary.orderId}.
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="order-summaries__list">
        {summaries.map((summary) => (
          <article className="order-summary" key={summary.orderId}>
            <header className="order-summary__header">
              <div>
                <p>ORDER SUMMARY</p>
                <h3>Order #{summary.orderId}</h3>
              </div>
              <strong>{summary.restaurantName}</strong>
            </header>
            <dl className="order-summary__times">
              <div><dt>Placed</dt><dd>{new Date(summary.placedAt).toLocaleString()}</dd></div>
              <div><dt>Delivered</dt><dd>{new Date(summary.deliveredAt).toLocaleString()}</dd></div>
              <div><dt>Summary created</dt><dd>{new Date(summary.generatedAt).toLocaleString()}</dd></div>
            </dl>
            <h4>Items</h4>
            <ul className="order-summary__lines">
              {summary.lines.map((line, index) => (
                <li key={`${line.name}-${index}`}>
                  <span>{line.quantity} × {line.name}</span>
                  <span>{money(line.quantity * line.unitPriceCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="order-summary__fare">
              <div><dt>Subtotal</dt><dd>{money(summary.fare.subtotalCents)}</dd></div>
              <div><dt>Delivery fee</dt><dd>{money(summary.fare.deliveryFeeCents)}</dd></div>
              <div><dt>Service fee</dt><dd>{money(summary.fare.serviceFeeCents)}</dd></div>
              <div><dt>Small-order surcharge</dt><dd>{money(summary.fare.smallOrderSurchargeCents)}</dd></div>
              <div className="order-summary__total"><dt>Total charged</dt><dd>{money(summary.fare.totalCents)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
