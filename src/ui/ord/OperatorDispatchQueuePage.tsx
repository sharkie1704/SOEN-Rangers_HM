import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import type { ReassignmentResult, StalledOrder } from "../../application/dlv/ReassignmentService.ts";
import "./operator-orders.css";

type DispatchQueueEntry = {
  position: number;
  orderId: number;
  restaurantId: string;
  restaurantName: string;
  readyAt: string;
};

export async function reassignStalledOrder(orderId: number): Promise<string> {
  const result = await api<ReassignmentResult>(`/api/orders/${orderId}/reassign`, { method: "POST" });
  return result.offeredTo === null
    ? `Order #${result.orderId}: previous courier released. No replacement courier was available; the order is waiting for dispatch.`
    : `Order #${result.orderId}: previous courier released. A new offer was sent to courier ${result.offeredTo}.`;
}

export default function OperatorDispatchQueuePage() {
  const [activeTab, setActiveTab] = useState<"queue" | "stalled">("queue");
  const [entries, setEntries] = useState<DispatchQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [stalled, setStalled] = useState<StalledOrder[]>([]);
  const [stalledLoading, setStalledLoading] = useState(true);
  const [stalledError, setStalledError] = useState("");
  const [reassigningOrderId, setReassigningOrderId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadStalled() {
      setStalledLoading(true);
      setStalledError("");
      try {
        const response = await api<{ stalled: StalledOrder[] }>("/api/dispatch/stalled");
        if (!cancelled) setStalled(response.stalled);
      } catch (cause) {
        if (!cancelled) setStalledError(cause instanceof ApiError ? cause.message : "Could not load stalled orders. Please refresh.");
      } finally {
        if (!cancelled) setStalledLoading(false);
      }
    }
    void loadStalled();
    return () => { cancelled = true; };
  }, [refreshCount]);

  async function reassign(orderId: number) {
    if (reassigningOrderId !== null) return;
    setReassigningOrderId(orderId);
    setActionError("");
    setMessage("");
    try {
      setMessage(await reassignStalledOrder(orderId));
    } catch (cause) {
      setActionError(cause instanceof ApiError ? cause.message : "Could not reassign the order. Refresh to check its current state before trying again.");
    } finally {
      setReassigningOrderId(null);
      setRefreshCount((count) => count + 1);
    }
  }

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
          <p>{activeTab === "queue" ? "Ready orders waiting for courier assignment, in backend queue order." : "Review stalled deliveries and reassign them to an eligible courier."}</p>
        </div>
        <button
          type="button"
          disabled={(activeTab === "queue" ? loading : stalledLoading) || reassigningOrderId !== null}
          onClick={() => setRefreshCount((count) => count + 1)}
        >
          {activeTab === "queue" ? "Refresh queue" : "Refresh stalled orders"}
        </button>
      </header>
      <div className="operator-dispatch__tabs" role="tablist" aria-label="Dispatch views">
        {([ ["queue", "Dispatch Queue"], ["stalled", "Stalled Orders"] ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`dispatch-tab-${id}`}
            aria-selected={activeTab === id}
            aria-controls={`dispatch-panel-${id}`}
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => setActiveTab(id)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? "queue" : event.key === "End" ? "stalled" : id === "queue" ? "stalled" : "queue";
              setActiveTab(next);
              document.getElementById(`dispatch-tab-${next}`)?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="dispatch-panel-queue" aria-labelledby="dispatch-tab-queue" hidden={activeTab !== "queue"} tabIndex={0}>
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
      </div>
      <section className="operator-dispatch__stalled" role="tabpanel" id="dispatch-panel-stalled" aria-labelledby="dispatch-tab-stalled" hidden={activeTab !== "stalled"} tabIndex={0}>
        <h2 id="operator-stalled-heading">Stalled Orders</h2>
        <p>Accepted deliveries waiting for pickup whose courier is offline or unavailable.</p>
        {message && <p role="status">{message}</p>}
        {actionError && <p className="operator-dispatch__error" role="alert">{actionError}</p>}
        {stalledError && <p className="operator-dispatch__error" role="alert">{stalledError}</p>}
        {stalledLoading && <p role="status">Loading stalled orders…</p>}
        {!stalledLoading && !stalledError && stalled.length === 0 && <p>No stalled orders.</p>}
        {!stalledLoading && !stalledError && stalled.length > 0 && (
          <ul className="operator-dispatch__list" aria-label="Stalled orders">
            {stalled.map((order) => (
              <li className="operator-dispatch__entry operator-dispatch__stalled-entry" key={order.orderId}>
                <span>Order #{order.orderId}</span>
                <span>Restaurant: {order.restaurantId}</span>
                <span>Assigned courier: {order.courierId}</span>
                <button
                  type="button"
                  aria-label={`Reassign order #${order.orderId}`}
                  disabled={reassigningOrderId !== null}
                  onClick={() => void reassign(order.orderId)}
                >
                  {reassigningOrderId === order.orderId ? "Reassigning…" : "Reassign"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
