import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import { page, row, primary, secondary } from "../ord/MenuEditorPage";
import "../ord/button-interactions.css";

type CourierStatus = "OFFLINE" | "IDLE" | "ASSIGNED" | "CARRYING";

const statusLabels: Record<CourierStatus, string> = {
  OFFLINE: "Off duty",
  IDLE: "On duty, waiting for an order",
  ASSIGNED: "Assigned to an order",
  CARRYING: "Carrying an order",
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

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const current = await fetchStatus();
        if (!cancelled) setStatus(current);
      } catch {
        if (!cancelled) setError("Could not load your status. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStatus();
    return () => { cancelled = true; };
  }, []);

  async function changeStatus(next: "IDLE" | "OFFLINE") {
    setSaving(true);
    setError("");
    try {
      const res = await api<{ courier: { status: CourierStatus } }>("/api/couriers/me/availability", {
        method: "PATCH",
        body: { status: next },
      });
      setStatus(res.courier.status);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update your status. Please try again.");
      // A refused change means the status shown here is out of date
      if (e instanceof ApiError && e.status === 409) setStatus(await fetchStatus().catch(() => status));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={page}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "28px", margin: "0 0 16px" }}>Availability</h2>

        {loading && <p>Loading your status...</p>}
        {error && <p className="error" role="alert">{error}</p>}

        {status && (
          <div style={row}>
            <strong>{statusLabels[status]}</strong>
            <span style={{ marginLeft: "auto" }}>
              {status === "OFFLINE" && (
                <button className="interactive-button" style={primary} disabled={saving} onClick={() => changeStatus("IDLE")}>
                  Go on duty
                </button>
              )}
              {status === "IDLE" && (
                <button className="interactive-button" style={secondary} disabled={saving} onClick={() => changeStatus("OFFLINE")}>
                  Go off duty
                </button>
              )}
            </span>
          </div>
        )}
        {(status === "ASSIGNED" || status === "CARRYING") && (
          <p>You can go off duty once this delivery is finished.</p>
        )}
      </div>
    </section>
  );
}
