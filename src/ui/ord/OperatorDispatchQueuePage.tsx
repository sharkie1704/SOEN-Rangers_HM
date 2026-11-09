import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import "./operator-orders.css";

type DispatchQueueEntry = {
  position: number;
  orderId: number;
  restaurantId: string;
  restaurantName: string;
  readyAt: string;
};

export default function OperatorDispatchQueuePage() {
  const [entries, setEntries] = useState<DispatchQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadQueue() {
      setLoading(true);
      setError("");
      try {
        const response = await api<{ waiting: DispatchQueueEntry[] }>("/api/dispatch/queue");
        if (!cancelled) setEntries(response.waiting);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof ApiError ? cause.message : "Could not load the dispatch queue. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadQueue();
    return () => { cancelled = true; };
  }, [refreshCount]);

  useEffect(() => {
    const events = new EventSource("/api/command-events");
    events.addEventListener("command", () => setRefreshCount((count) => count + 1));
    return () => events.close();
  }, []);

  return (
    <section className="operator-dispatch" aria-labelledby="operator-dispatch-heading">
      <header className="operator-dispatch__heading">
        <div>
          <h1 id="operator-dispatch-heading">Dispatch Queue</h1>
          <p>Ready orders waiting for courier assignment, in backend queue order.</p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRefreshCount((count) => count + 1)}
        >
          Refresh queue
        </button>
      </header>
      {error && <p className="operator-dispatch__error" role="alert">{error}</p>}
      {loading && <p role="status">Loading dispatch queue…</p>}
      {!loading && !error && entries.length === 0 && (
        <div className="operator-dispatch__empty">
          <strong>No orders are waiting for dispatch.</strong>
          <p>Ready orders will appear here when they enter the queue.</p>
        </div>
      )}
      {!loading && !error && entries.length > 0 && (
        <ol className="operator-dispatch__list" aria-label="Orders waiting for courier assignment">
          {entries.map((entry) => (
            <li className="operator-dispatch__entry" key={entry.orderId}>
              <span>Queue position {entry.position}</span>
              <span>Order #{entry.orderId}</span>
              <span>{entry.restaurantName}</span>
              <span>
                Ready <time dateTime={entry.readyAt}>{new Date(entry.readyAt).toLocaleString()}</time>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
