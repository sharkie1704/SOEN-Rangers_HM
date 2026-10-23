export type OutputLevel = "info" | "error";

export type OutputEntry = {
  id: number;
  time: Date;
  level: OutputLevel;
  message: string;
};

const MAX_OUTPUT_ENTRIES = 100;
let nextId = 1;
let entries: OutputEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function recordOutput(message: string, level: OutputLevel = "info") {
  entries = [...entries, { id: nextId++, time: new Date(), level, message }].slice(-MAX_OUTPUT_ENTRIES);
  notify();
}

export function clearOutput() {
  entries = [];
  notify();
}

export function subscribeToOutput(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOutputSnapshot() {
  return entries;
}
