import { useSyncExternalStore } from "react";
import { clearOutput, getOutputSnapshot, subscribeToOutput } from "./outputLog";
import "./output-console.css";

export default function OutputConsole() {
  const entries = useSyncExternalStore(subscribeToOutput, getOutputSnapshot, getOutputSnapshot);

  return (
    <aside className="output-console" aria-label="System output console">
      <header className="output-console__header">
        <div>
          <p className="output-console__eyebrow">DASHBOARD LOG</p>
          <h2>System output</h2>
        </div>
        <button type="button" onClick={clearOutput} disabled={entries.length === 0}>
          Clear
        </button>
      </header>
      <ol className="output-console__entries" role="log" aria-live="polite" aria-relevant="additions">
        {entries.length === 0 ? (
          <li className="output-console__empty">Commands and errors will appear here.</li>
        ) : entries.slice().reverse().map((entry) => (
          <li className={`output-console__entry output-console__entry--${entry.level}`} key={entry.id}>
            <time dateTime={entry.time.toISOString()}>{entry.time.toLocaleTimeString()}</time>
            <span>{entry.level === "error" ? "ERROR" : "INFO"}</span>
            <p>{entry.message}</p>
          </li>
        ))}
      </ol>
    </aside>
  );
}
