import { Assignment } from "../../domain/dlv/Assignment.ts";
import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import type { AssignmentRepository } from "./AssignmentRepository.ts";
import type { CourierAvailabilityRepository } from "./CourierAvailabilityRepository.ts";
import type { CourierIdleObserver } from "./CourierIdleSubject.ts";
import type { DispatchQueueService } from "./DispatchQueueService.ts";

export class DispatchQueueObserver implements CourierIdleObserver {
  constructor(
    private readonly queue: DispatchQueueService,
    private readonly assignments: AssignmentRepository,
    private readonly couriers: CourierAvailabilityRepository,
  ) {}

  async courierBecameIdle(courierId: string): Promise<void> {
    const courier = await this.couriers.findByCourierId(courierId);
    if (courier?.status !== "IDLE") return;
    if (await this.assignments.findActiveByCourierId(courierId)) return;

    const declined = new Set(await this.assignments.findDeclinedOrderIds(courierId));
    const queue = await this.queue.current();
    for (const waiting of queue.entries) {
      if (declined.has(waiting.orderId)) continue;
      try {
        await this.assignments.saveOffer(new Assignment(waiting.orderId, courierId), {
          eventId: await this.assignments.nextEventId(),
          orderId: waiting.orderId,
          courierId,
          occurredAt: new Date(),
        });
        return;
      } catch (error) {
        if (error instanceof AssignmentError && error.code === "CONFLICT") continue;
        throw error;
      }
    }
  }
}
