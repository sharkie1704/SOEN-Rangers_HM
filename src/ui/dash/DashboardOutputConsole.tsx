import { useEffect, useRef, useState } from "react";
import { publishLocalOutputEvent, subscribeToLocalOutputEvents, type OutputEvent } from "../reg/api/OutputEvents";
import "./dashboard-output-console.css";

interface ConsoleEntry {
  id: number;
  timestamp: string;
  command: string;
  outcome: string;
  status: number;
  failed: boolean;
}

export const OUTPUT_CONSOLE_PAGE_SIZE = 20;

export function getOutputPage<T>(entries: T[], page: number): T[] {
  const start = (page - 1) * OUTPUT_CONSOLE_PAGE_SIZE;
  return entries.slice(start, start + OUTPUT_CONSOLE_PAGE_SIZE);
}

export function getOutputEntryType(entry: Pick<ConsoleEntry, "command" | "failed">): "Error" | "Request" | "Command" {
  if (entry.failed) return "Error";
  return ["GET", "HEAD", "OPTIONS"].includes(entry.command.split(" ", 1)[0]) ? "Request" : "Command";
}

function failureLabel(status: number): string {
  switch (status) {
    case 400:
    case 422:
      return "Validation error";
    case 401:
      return "Authentication required";
    case 403:
      return "Permission denied";
    case 404:
      return "Resource not found";
    case 409:
      return "Command rejected";
    default:
      return status >= 500 ? "System error" : "Request failed";
  }
}

export function formatOutputEvent(event: OutputEvent): Omit<ConsoleEntry, "id"> {
  const timestamp = new Date(event.timestamp).toLocaleTimeString();
  const command = `${event.method} ${event.path}`;

  if (event.status === 0) {
    return { timestamp, command, status: 0, outcome: "Connection error", failed: true };
  }
  if ("outcome" in event && typeof event.outcome === "string") {
    return {
      timestamp,
      command,
      status: event.status,
      outcome: event.outcome,
      failed: event.status >= 400,
    };
  }
  if (event.status >= 400) {
    return {
      timestamp,
      command,
      status: event.status,
      outcome: failureLabel(event.status),
      failed: true,
    };
  }

  const deliveryMatch = event.method === "POST" && event.path.match(/^\/api\/orders\/(\d+)\/deliver$/);
  if (deliveryMatch) {
    return {
      timestamp,
      command,
      status: event.status,
      outcome: `Order #${deliveryMatch[1]} delivered successfully.`,
      failed: false,
    };
  }
  const orderCommand = event.method === "POST" && event.path.match(/^\/api\/orders\/(\d+)\/(accept|reject|ready|cancel|pickup|offer\/accept|offer\/decline)$/);
  if (orderCommand) {
    const [, orderId, action] = orderCommand;
    const outcome: Record<string, string> = {
      accept: "accepted",
      reject: "rejected",
      ready: "marked ready",
      cancel: "cancelled",
      pickup: "pickup confirmed for",
      "offer/accept": "delivery offer accepted for",
      "offer/decline": "delivery offer declined for",
    };
    const phrase = outcome[action];
    return {
      timestamp,
      command,
      status: event.status,
      outcome: action === "pickup" || action.startsWith("offer/")
        ? `${phrase} order #${orderId}.`
        : `Order #${orderId} ${phrase}.`,
      failed: false,
    };
  }
  if (event.method === "POST" && event.path === "/api/orders") {
    return { timestamp, command, status: event.status, outcome: "Order placed successfully.", failed: false };
  }
  if (event.method === "PATCH" && /^\/api\/couriers\/me\/availability$/.test(event.path)) {
    return { timestamp, command, status: event.status, outcome: "Courier availability updated.", failed: false };
  }
  if (event.method === "PATCH" && /^\/api\/restaurants\/[^/]+\/status$/.test(event.path)) {
    return { timestamp, command, status: event.status, outcome: "Restaurant status updated.", failed: false };
  }

  return { timestamp, command, status: event.status, outcome: "Completed successfully.", failed: false };
}

export default function DashboardOutputConsole() {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [page, setPage] = useState(1);
  const [connectionError, setConnectionError] = useState(false);
  const nextId = useRef(0);
  const connectionFailureLogged = useRef(false);

  useEffect(() => {
    const events = new EventSource("/api/command-events");
    const appendEvent = (event: OutputEvent) => {
      const formatted = formatOutputEvent(event);
      setEntries((current) => [
        { ...formatted, id: nextId.current++ },
        ...current,
      ]);
      setConnectionError(false);
    };
    const handleOutput = (message: MessageEvent<string>) => {
      appendEvent(JSON.parse(message.data) as OutputEvent);
    };

    events.addEventListener("output", handleOutput as EventListener);
    events.onopen = () => {
      setConnectionError(false);
      connectionFailureLogged.current = false;
    };
    events.onerror = () => {
      setConnectionError(true);
      if (!connectionFailureLogged.current) {
        connectionFailureLogged.current = true;
        publishLocalOutputEvent({
          method: "GET",
          path: "/api/command-events",
          status: 0,
          timestamp: new Date().toISOString(),
        });
      }
    };
    const unsubscribeLocal = subscribeToLocalOutputEvents(appendEvent);

    return () => {
      events.close();
      unsubscribeLocal();
    };
  }, []);

  const pageCount = Math.max(1, Math.ceil(entries.length / OUTPUT_CONSOLE_PAGE_SIZE));
  const visibleEntries = getOutputPage(entries, page);

  return (
    <section className="dashboard-output-console" aria-label="Dashboard output console">
      <header className="dashboard-output-console__heading">
        <div>
          <p className="dashboard-output-console__eyebrow">SYSTEM ACTIVITY</p>
          <h1>Output Console</h1>
          <p className="dashboard-output-console__description">Live commands and errors from dashboard actions.</p>
        </div>
        {connectionError && <p className="dashboard-output-console__connection-error" role="status">Reconnecting to system activity…</p>}
      </header>
      <div className="dashboard-output-console__table-wrap" role="region" aria-label="System activity log" tabIndex={0}>
        <table className="dashboard-output-console__table">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Type</th>
              <th scope="col">Command</th>
              <th scope="col">Outcome</th>
            </tr>
          </thead>
          <tbody aria-live="polite" aria-relevant="additions">
            {entries.length === 0 ? (
              <tr>
                <td className="dashboard-output-console__empty" colSpan={4}>Waiting for system activity.</td>
              </tr>
            ) : visibleEntries.map((entry) => {
              const entryType = getOutputEntryType(entry);
              return (
                <tr key={entry.id}>
                  <td><time>{entry.timestamp}</time></td>
                  <td>
                    <span className={`dashboard-output-console__type dashboard-output-console__type--${entryType.toLowerCase()}`}>
                      {entryType}
                    </span>
                  </td>
                  <td><code>{entry.command}</code></td>
                  <td className={entry.failed ? "dashboard-output-console__error" : undefined}>
                    {entry.outcome} <span className="dashboard-output-console__status">({entry.status || "No response"})</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {entries.length > OUTPUT_CONSOLE_PAGE_SIZE && (
        <nav className="dashboard-output-console__pagination" aria-label="System activity pages">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
            Previous
          </button>
          <span aria-live="polite">Page {page} of {pageCount}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
