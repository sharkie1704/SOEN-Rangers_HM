export type OrderStatus =
  | "Placed"
  | "Accepted"
  | "Preparing"
  | "Ready"
  | "Rejected"
  | "Cancelled";

export type OrderAction =
  | "place"
  | "accept"
  | "reject"
  | "cancel"
  | "start-preparing"
  | "mark-ready";

export interface StateChangeEvent {
  readonly eventId: number;
  readonly orderId: number;
  readonly actorId: string;
  readonly action: OrderAction;
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly occurredAt: Date;
  readonly reason?: string;
}
