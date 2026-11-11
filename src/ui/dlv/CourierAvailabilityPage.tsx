import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import "./courier-availability.css";

type CourierStatus = "OFFLINE" | "IDLE" | "ASSIGNED" | "CARRYING";
type ToggleStatus = "OFFLINE" | "IDLE";

const statusContent: Record<CourierStatus, { label: string; detail: string; tone: string }> = {
  OFFLINE: {
    label: "Off duty",
    detail: "You’re not receiving delivery offers. Go on duty when you’re ready to work.",
    tone: "offline",
  },
  IDLE: {
    label: "Available for deliveries",
    detail: "You’re on duty and ready. New delivery offers can be assigned to you.",
    tone: "available",
  },
  ASSIGNED: {
    label: "Delivery assigned",
    detail: "You have an accepted delivery. If you go off duty before pickup, an operator can reassign it.",
    tone: "assigned",
  },
  CARRYING: {
    label: "Out for delivery",
    detail: "You’re carrying an order to its destination. You can go off duty after delivery.",
    tone: "carrying",
  },
};

async function fetchStatus(): Promise<CourierStatus> {
  const res = await api<{ courier: { status: CourierStatus } }>("/api/couriers/me/availability");
  return res.courier.status;
}

export default function CourierAvailabilityPage() {
  const [status, setStatus] = useState<CourierStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setLoading(true);
      setError("");
      try {
        const current = await fetchStatus();
        if (!cancelled) setStatus(current);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof ApiError ? cause.message : "Could not load your availability. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStatus();
    return () => { cancelled = true; };
  }, [loadAttempt]);

  async function changeStatus(next: ToggleStatus) {
    setSaving(true);
    setError("");
    try {
      const res = await api<{ courier: { status: CourierStatus } }>("/api/couriers/me/availability", {
        method: "PATCH",
        body: { status: next },
      });
      setStatus(res.courier.status);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not update your availability. Please try again.");
      if (cause instanceof ApiError && cause.status === 409) {
        try {
          setStatus(await fetchStatus());
        } catch (refreshCause) {
          setError(
            `${cause.message} We also couldn't refresh your status: ${
              refreshCause instanceof ApiError ? refreshCause.message : "Please try loading again."
            }`,
          );
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const content = status ? statusContent[status] : null;
  const canToggleDuty = status !== null && status !== "CARRYING";

  return (
    <section className="courier-availability" aria-label="Courier availability" aria-busy={loading || saving}>
      <header className="courier-availability__header">
        <div>
          <p className="courier-availability__eyebrow">YOUR WORK STATUS</p>
          <h1>Availability</h1>
        </div>
        {content && (
          <span className={`courier-availability__badge courier-availability__badge--${content.tone}`}>
            <span aria-hidden="true" />
            {content.label}
          </span>
        )}
      </header>

      {error && (
        <div className="courier-availability__error" role="alert">
          <p>{error}</p>
          {!loading && (
            <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
              Refresh status
            </button>
          )}
        </div>
      )}

      {loading && !status && (
        <div className="courier-availability__loading" role="status" aria-live="polite">
          <span className="courier-availability__spinner" aria-hidden="true" />
          <span>Checking your availability…</span>
        </div>
      )}

      {content && (
        <>
          <article className={`courier-availability__status-card courier-availability__status-card--${content.tone}`}>
            <div className="courier-availability__status-summary">
              <div className="courier-availability__status-icon" aria-hidden="true">
                <svg viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="20" />
                  <path d="M24 13v11l7 4" />
                </svg>
              </div>
              <div className="courier-availability__status-copy">
                <p className="courier-availability__status-label">Current status</p>
                <h2>{content.label}</h2>
                <p>{content.detail}</p>
              </div>
              <div className="courier-availability__control" aria-label="Availability controls">
                {canToggleDuty ? (
                  <button
                    type="button"
                    className={`courier-availability__action${status !== "OFFLINE" ? " courier-availability__action--secondary" : ""}`}
                    disabled={saving || loading}
                    onClick={() => void changeStatus(status === "OFFLINE" ? "IDLE" : "OFFLINE")}
                  >
                    {saving
                      ? "Updating status…"
                      : status === "OFFLINE"
                        ? "Go on duty"
                        : "Go off duty"}
                  </button>
                ) : (
                  <span className="courier-availability__locked">
                    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="5" y="10" width="14" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
                    </svg>
                    Duty controls locked
                  </span>
                )}
              </div>
            </div>
          </article>

          <p className="courier-availability__footnote">
            {status === "CARRYING"
              && "To protect active deliveries, you can’t change your duty status while carrying an order."}
          </p>
        </>
      )}

      {!loading && !status && !error && (
        <div className="courier-availability__empty">
          <strong>Your availability couldn’t be displayed.</strong>
          <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Try again</button>
        </div>
      )}
    </section>
  );
}
