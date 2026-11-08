import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import "./billing-ledger.css";

type LedgerEntry = {
  eventId: number;
  orderId: number;
  finalState: "Delivered" | "Rejected" | "Cancelled";
  epoch: number;
  placedAt: string;
  finalizedAt: string;
  deliveredAt: string | null;
  totalChargeCents: number | null;
};

type LedgerSnapshot = {
  currentEpoch: number;
  entries: LedgerEntry[];
};

function money(cents: number | null): string {
  return cents === null ? "Unavailable (legacy order)" : `$${(cents / 100).toFixed(2)}`;
}

export default function BillingLedger() {
  const [snapshot, setSnapshot] = useState<LedgerSnapshot | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadLedger() {
    setLoading(true);
    setError("");
    try {
      setSnapshot(await api<LedgerSnapshot>("/api/ledger"));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load the billing ledger.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLedger();
  }, []);

  async function resetLedger() {
    setResetting(true);
    setError("");
    setMessage("");
    try {
      const { epoch } = await api<{ epoch: number }>("/api/ledger/reset", { method: "POST" });
      setSnapshot(await api<LedgerSnapshot>("/api/ledger"));
      setShowHistory(false);
      setMessage(`Ledger reset. New entries will be recorded in epoch ${epoch}; prior entries remain in audit history.`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not reset the billing ledger.");
    } finally {
      setResetting(false);
    }
  }

  const entries = snapshot?.entries.filter((entry) => showHistory || entry.epoch === snapshot.currentEpoch) ?? [];

  return (
    <section className="billing-ledger" aria-label="Billing ledger">
      <header className="billing-ledger__header">
        <div>
          <p className="billing-ledger__eyebrow">PRICING &amp; HISTORY</p>
          <h2>Billing ledger</h2>
          <p>Final order states and charges. Ledger entries are immutable.</p>
        </div>
        <div className="billing-ledger__actions">
          <button type="button" onClick={() => setShowHistory((visible) => !visible)} disabled={!snapshot}>
            {showHistory ? "Show current ledger" : "Show all history"}
          </button>
          <button type="button" onClick={() => void loadLedger()} disabled={loading || resetting}>
            Refresh
          </button>
          <button type="button" onClick={() => void resetLedger()} disabled={loading || resetting}>
            {resetting ? "Resetting…" : "Reset current ledger"}
          </button>
        </div>
      </header>

      <p className="billing-ledger__note">
        Reset starts a new visible epoch; it does not delete archived financial history.
        {snapshot && <> Current epoch: <strong>{snapshot.currentEpoch}</strong>.</>}
      </p>
      {message && <p className="billing-ledger__message" role="status">{message}</p>}
      {error && <p className="billing-ledger__error" role="alert">{error}</p>}
      {loading && <p role="status">Loading billing ledger…</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="billing-ledger__empty">
          {showHistory ? "No ledger entries yet." : "No entries in the current ledger epoch."}
        </p>
      )}
      {!loading && !error && entries.length > 0 && (
        <div className="billing-ledger__table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Final state</th>
                <th scope="col">Placed</th>
                <th scope="col">Finalized</th>
                {showHistory && <th scope="col">Epoch</th>}
                <th scope="col">Total charge</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.eventId}>
                  <td>#{entry.orderId}</td>
                  <td>{entry.finalState}</td>
                  <td>{new Date(entry.placedAt).toLocaleString()}</td>
                  <td>{new Date(entry.deliveredAt ?? entry.finalizedAt).toLocaleString()}</td>
                  {showHistory && <td>{entry.epoch}</td>}
                  <td>{money(entry.totalChargeCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
