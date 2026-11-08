import type { WaitingOrder } from "../../domain/dlv/DispatchQueue.ts";

export interface DispatchQueueRepository {
  listWaiting(): Promise<WaitingOrder[]>;
}
