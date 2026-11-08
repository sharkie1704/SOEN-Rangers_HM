import type { LedgerEntry } from "../../domain/prc/LedgerEntry.ts";

export interface LedgerSnapshot {
  readonly currentEpoch: number;
  readonly entries: readonly LedgerEntry[];
}

export interface LedgerRepository {
  read(): Promise<LedgerSnapshot>;
  startNewEpoch(): Promise<number>;
}
