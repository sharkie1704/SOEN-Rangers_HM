import type { CourierIdleObserver } from "./CourierIdleSubject.ts";
import type { DispatchQueueService } from "./DispatchQueueService.ts";
import type { OrderOffers } from "./DispatchService.ts";

export class DispatchQueueObserver implements CourierIdleObserver {
  constructor(
    private readonly queue: DispatchQueueService,
    private readonly offers: OrderOffers,
  ) {}

  async courierBecameIdle(_courierId: string): Promise<void> {
    const queue = await this.queue.current();
    for (const waiting of queue.entries) {
      try {
        await this.offers.offer(waiting.orderId);
      } catch (error) {
        console.error(`[DLV] Could not offer waiting order ${waiting.orderId}.`, error);
      }
    }
  }
}
