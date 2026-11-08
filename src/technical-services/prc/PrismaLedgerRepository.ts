import { prisma } from "../db/PrismaClient.ts";
import type { LedgerEntry, LedgerFinalState } from "../../domain/prc/LedgerEntry.ts";
import type { LedgerRepository, LedgerSnapshot } from "../../application/prc/LedgerRepository.ts";
import type { OrderStatus as DbOrderStatus } from "../../generated/prisma/client.ts";

const toDomainState: Partial<Record<DbOrderStatus, LedgerFinalState>> = {
  DELIVERED: "Delivered",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export class PrismaLedgerRepository implements LedgerRepository {
  async read(): Promise<LedgerSnapshot> {
    return prisma.$transaction(async (tx) => {
      const state = await tx.ledgerState.findUnique({ where: { id: "default" } });
      if (!state) {
        throw new Error("Ledger state is missing. Apply the billing ledger migration.");
      }
      const rows = await tx.ledgerEntry.findMany({
        orderBy: [{ finalizedAt: "desc" }, { eventId: "desc" }],
      });
      const entries: LedgerEntry[] = rows.map((row) => {
        const finalState = toDomainState[row.finalState];
        if (!finalState) {
          throw new Error(`Ledger entry ${row.eventId} has a non-terminal state.`);
        }
        return Object.freeze({
          eventId: row.eventId,
          orderId: row.orderId,
          finalState,
          epoch: row.epoch,
          placedAt: row.placedAt,
          finalizedAt: row.finalizedAt,
          deliveredAt: row.deliveredAt,
          totalChargeCents: row.totalChargeCents,
        });
      });
      return { currentEpoch: state.epoch, entries };
    });
  }

  async startNewEpoch(): Promise<number> {
    const state = await prisma.ledgerState.update({
      where: { id: "default" },
      data: { epoch: { increment: 1 } },
      select: { epoch: true },
    });
    return state.epoch;
  }
}
