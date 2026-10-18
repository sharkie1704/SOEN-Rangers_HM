import { OrderState } from "./OrderState.ts";

export class RejectedState extends OrderState {
  readonly status = "Rejected" as const;
}
