import type { Prisma } from "../../generated/prisma/client.ts";
import { createLedgerEntry } from "../../domain/prc/LedgerEntry.ts";
import type { Order } from "../../domain/ord/Order.ts";
import type { StateChangeEvent } from "../../domain/ord/StateChangeEvent.ts";
import type { OrderStatus as DbOrderStatus } from "../../generated/prisma/client.ts";

const toDbState: Record<"Delivered" | "Rejected" | "Cancelled", DbOrderStatus> = {
  Delivered: "DELIVERED",
  Rejected: "REJECTED",
  Cancelled: "CANCELLED",
};

export class PrismaLedgerEntryStore {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async add(order: Order, event: StateChangeEvent): Promise<void> {
    const [state] = await this.tx.$queryRaw<{ epoch: number }[]>`
      SELECT "epoch" FROM "LedgerState" WHERE "id" = 'default' FOR UPDATE
    `;
    if (!state) {
      throw new Error("Ledger state is missing. Apply the billing ledger migration.");
    }

    const entry = createLedgerEntry(order, event, state.epoch);
    await this.tx.ledgerEntry.create({
      data: {
        eventId: entry.eventId,
        orderId: entry.orderId,
        finalState: toDbState[entry.finalState],
        epoch: entry.epoch,
        placedAt: entry.placedAt,
        finalizedAt: entry.finalizedAt,
        deliveredAt: entry.deliveredAt,
        totalChargeCents: entry.totalChargeCents,
      },
    });
  }
}
