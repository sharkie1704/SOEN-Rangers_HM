import { OrderError } from "../OrderError.ts";
import type { OrderAction, OrderStatus } from "../StateChangeEvent.ts";

export abstract class OrderState {
  abstract readonly status: OrderStatus;

  accept(): OrderState {
    return this.disallow("accept");
  }

  reject(): OrderState {
    return this.disallow("reject");
  }

  cancel(): OrderState {
    return this.disallow("cancel");
  }

  startPreparing(): OrderState {
    return this.disallow("start-preparing");
  }

  markReady(): OrderState {
    return this.disallow("mark-ready");
  }

  private disallow(action: OrderAction): never {
    throw new OrderError("INVALID_TRANSITION", `Cannot ${action} an order in ${this.status} state.`);
  }
}
