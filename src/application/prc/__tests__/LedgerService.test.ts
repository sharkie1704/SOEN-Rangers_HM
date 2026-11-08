import { describe, expect, it } from "vitest";
import type { LedgerEntry } from "../../../domain/prc/LedgerEntry.ts";
import { Role } from "../../../domain/reg/Role.ts";
import type { LedgerRepository, LedgerSnapshot } from "../LedgerRepository.ts";
import { LedgerService } from "../LedgerService.ts";

class InMemoryLedgerRepository implements LedgerRepository {
  epoch = 0;
  entries: LedgerEntry[] = [];

  async read(): Promise<LedgerSnapshot> {
    return { currentEpoch: this.epoch, entries: [...this.entries] };
  }

  async startNewEpoch(): Promise<number> {
    this.epoch += 1;
    return this.epoch;
  }
}

describe("LedgerService", () => {
  it("allows only operators to read the full ledger", async () => {
    const repository = new InMemoryLedgerRepository();
    const service = new LedgerService(repository);

    await expect(service.read({ userId: "operator-1", role: Role.OPERATOR }))
      .resolves.toEqual({ currentEpoch: 0, entries: [] });
    await expect(service.read({ userId: "customer-1", role: Role.CUSTOMER }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.read(null)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("starts a new visible epoch without deleting prior entries", async () => {
    const repository = new InMemoryLedgerRepository();
    const service = new LedgerService(repository);
    const archivedEntry: LedgerEntry = {
      eventId: 7,
      orderId: 3,
      finalState: "Rejected",
      epoch: 0,
      placedAt: new Date("2026-11-07T10:00:00Z"),
      finalizedAt: new Date("2026-11-07T10:05:00Z"),
      deliveredAt: null,
      totalChargeCents: 0,
    };
    repository.entries.push(archivedEntry);

    await expect(service.reset({ userId: "operator-1", role: Role.OPERATOR }))
      .resolves.toEqual({ epoch: 1 });
    await expect(service.read({ userId: "operator-1", role: Role.OPERATOR }))
      .resolves.toEqual({ currentEpoch: 1, entries: [archivedEntry] });
  });

  it("does not allow non-operators to reset the ledger", async () => {
    const service = new LedgerService(new InMemoryLedgerRepository());

    await expect(service.reset({ userId: "staff-1", role: Role.RESTAURANT }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
