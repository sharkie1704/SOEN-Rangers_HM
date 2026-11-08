import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    ledgerState: { findUnique: vi.fn() },
    ledgerEntry: { findMany: vi.fn() },
  };
  return {
    tx,
    prisma: {
      $transaction: vi.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)),
      ledgerState: { update: vi.fn() },
    },
  };
});

vi.mock("../../db/PrismaClient.ts", () => ({ prisma: mocks.prisma }));

import { PrismaLedgerRepository } from "../PrismaLedgerRepository.ts";

describe("PrismaLedgerRepository", () => {
  beforeEach(() => {
    mocks.tx.ledgerState.findUnique.mockResolvedValue({ epoch: 2 });
    mocks.tx.ledgerEntry.findMany.mockResolvedValue([{
      eventId: 44,
      orderId: 21,
      finalState: "DELIVERED",
      epoch: 1,
      placedAt: new Date("2026-11-07T10:00:00Z"),
      finalizedAt: new Date("2026-11-07T10:30:00Z"),
      deliveredAt: new Date("2026-11-07T10:30:00Z"),
      totalChargeCents: 1550,
    }]);
    mocks.prisma.ledgerState.update.mockResolvedValue({ epoch: 3 });
  });

  it("reads every epoch so operators can access the complete audit history", async () => {
    const snapshot = await new PrismaLedgerRepository().read();

    expect(snapshot.currentEpoch).toBe(2);
    expect(snapshot.entries).toMatchObject([{
      eventId: 44,
      orderId: 21,
      finalState: "Delivered",
      epoch: 1,
      totalChargeCents: 1550,
    }]);
    expect(mocks.tx.ledgerEntry.findMany).toHaveBeenCalledWith({
      orderBy: [{ finalizedAt: "desc" }, { eventId: "desc" }],
    });
  });

  it("resets by atomically advancing the epoch without mutating entries", async () => {
    await expect(new PrismaLedgerRepository().startNewEpoch()).resolves.toBe(3);

    expect(mocks.prisma.ledgerState.update).toHaveBeenCalledWith({
      where: { id: "default" },
      data: { epoch: { increment: 1 } },
      select: { epoch: true },
    });
  });
});
