const listeners = new Set<() => void>();
const outputListeners = new Set<(event: OutputEvent) => void>();

export interface OutputEvent {
  method: string;
  path: string;
  status: number;
  timestamp: string;
}

export function publishCommandEvent(method: string, status: number): void {
  if (status >= 400 || !["POST", "PATCH", "PUT", "DELETE"].includes(method)) return;
  for (const listener of listeners) listener();
}

export function publishOutputEvent(event: Omit<OutputEvent, "timestamp">): void {
  const outputEvent: OutputEvent = { ...event, timestamp: new Date().toISOString() };
  for (const listener of outputListeners) listener(outputEvent);
}

export function subscribeToCommandEvents(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeToOutputEvents(listener: (event: OutputEvent) => void): () => void {
  outputListeners.add(listener);
  return () => outputListeners.delete(listener);
}
