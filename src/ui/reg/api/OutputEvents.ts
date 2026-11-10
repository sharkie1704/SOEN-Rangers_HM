export interface OutputEvent {
  method: string;
  path: string;
  status: number;
  timestamp: string;
  outcome?: string;
}

const localOutputListeners = new Set<(event: OutputEvent) => void>();

export function publishLocalOutputEvent(event: OutputEvent): void {
  for (const listener of localOutputListeners) listener(event);
}

export function subscribeToLocalOutputEvents(listener: (event: OutputEvent) => void): () => void {
  localOutputListeners.add(listener);
  return () => localOutputListeners.delete(listener);
}
