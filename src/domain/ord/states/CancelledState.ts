import { OrderState } from "./OrderState.ts";

export class CancelledState extends OrderState {
  readonly status = "Cancelled" as const;
}
