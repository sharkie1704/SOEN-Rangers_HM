export interface WaitingOrder {
  readonly orderId: number;
  readonly restaurantId: string;
  readonly restaurantName: string;
  readonly readyAt: Date;
}

export class DispatchQueue {
  readonly entries: readonly WaitingOrder[];

  constructor(waiting: readonly WaitingOrder[]) {
    this.entries = [...waiting].sort(
      (a, b) => a.readyAt.getTime() - b.readyAt.getTime() || a.orderId - b.orderId,
    );
  }

  get size(): number {
    return this.entries.length;
  }

  next(): WaitingOrder | undefined {
    return this.entries[0];
  }
}
