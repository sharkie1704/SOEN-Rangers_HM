import { OrderState } from "./OrderState.ts";

export class ReadyState extends OrderState {
  readonly status = "Ready" as const;
}
