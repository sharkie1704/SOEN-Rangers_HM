import { OrderError } from "../ord/OrderError.ts";
import type { Order } from "../ord/Order.ts";
import type { StateChangeEvent } from "../ord/StateChangeEvent.ts";

export type LedgerFinalState = "Delivered" | "Rejected" | "Cancelled";

export interface LedgerEntry {
  readonly eventId: number;
  readonly orderId: number;
  readonly finalState: LedgerFinalState;
  readonly epoch: number;
  readonly placedAt: Date;
  readonly finalizedAt: Date;
  readonly deliveredAt: Date | null;
  readonly totalChargeCents: number | null;
}

function isLedgerFinalState(status: string): status is LedgerFinalState {
  return status === "Delivered" || status === "Rejected" || status === "Cancelled";
}

function isTerminalAction(event: StateChangeEvent): boolean {
  return (event.to === "Delivered" && event.action === "deliver")
    || (event.to === "Rejected" && event.action === "reject")
    || (event.to === "Cancelled" && event.action === "cancel");
}

export function createLedgerEntry(order: Order, event: StateChangeEvent, epoch: number): LedgerEntry {
  if (!Number.isSafeInteger(epoch) || epoch < 0) {
    throw new OrderError("INVALID_INPUT", "Ledger epoch must be a non-negative safe integer.");
  }
  if (
    event.orderId !== order.id
    || event.to !== order.status
    || event.from === event.to
    || !isLedgerFinalState(event.to)
    || !isTerminalAction(event)
  ) {
    throw new OrderError("CONFLICT", "A ledger entry can only be created from an order's final-state event.");
  }

  const finalState = event.to;
  const deliveredAt = finalState === "Delivered" ? new Date(event.occurredAt) : null;
  const totalChargeCents = finalState === "Delivered" ? order.fare?.totalCents ?? null : 0;

  return Object.freeze({
    eventId: event.eventId,
    orderId: order.id,
    finalState,
    epoch,
    placedAt: order.placedAt,
    finalizedAt: new Date(event.occurredAt),
    deliveredAt,
    totalChargeCents,
  });
}
