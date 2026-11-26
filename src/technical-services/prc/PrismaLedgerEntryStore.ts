import type { Prisma } from "../../generated/prisma/client.ts";
import { createLedgerEntry } from "../../domain/prc/LedgerEntry.ts";
import type { Order } from "../../domain/ord/Order.ts";
import type { StateChangeEvent } from "../../domain/ord/StateChangeEvent.ts";
import type { OrderStatus as DbOrderStatus } from "../../generated/prisma/client.ts";

const toDbState: Record<"Delivered" | "Refunded" | "Rejected" | "Cancelled", DbOrderStatus> = {
  Delivered: "DELIVERED",
  Refunded: "REFUNDED",
  Rejected: "REJECTED",
  Cancelled: "CANCELLED",
};

export class PrismaLedgerEntryStore {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async addTerminalEvents(order: Order, events: readonly StateChangeEvent[]): Promise<void> {
    for (const event of events) {
      if (event.to !== "Delivered" && event.to !== "Refunded" && event.to !== "Rejected" && event.to !== "Cancelled") continue;
      await this.add(order, event);
    }
  }

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
        subtotalCents: entry.subtotalCents ?? null,
        deliveryFeeCents: entry.deliveryFeeCents ?? null,
        serviceFeeCents: entry.serviceFeeCents ?? null,
        smallOrderSurchargeCents: entry.smallOrderSurchargeCents ?? null,
        discountCents: entry.discountCents ?? null,
        promoCode: entry.promoCode ?? null,
      },
    });
  }
}
