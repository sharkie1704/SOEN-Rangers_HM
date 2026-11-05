import { CourierAvailability } from "../../../domain/dlv/CourierAvailability.ts";
import { CourierError } from "../../../domain/dlv/CourierError.ts";
import type { CourierStatus } from "../../../domain/dlv/states/CourierState.ts";
import type { CourierAvailabilityRepository, CourierStatusEvent } from "../CourierAvailabilityRepository.ts";

// Stores statuses rather than live objects, so save() can refuse stale changes like the real repository
export class InMemoryCourierAvailabilityRepository implements CourierAvailabilityRepository {
  statuses = new Map<string, CourierStatus>();
  events: CourierStatusEvent[] = [];
  private eventSeq = 0;

  withCourier(id: string, status: CourierStatus = "OFFLINE"): this {
    this.statuses.set(id, status);
    return this;
  }

  async nextEventId(): Promise<number> { return ++this.eventSeq; }

  async findByCourierId(courierId: string): Promise<CourierAvailability | undefined> {
    const status = this.statuses.get(courierId);
    return status ? new CourierAvailability(courierId, status) : undefined;
  }

  async save(courier: CourierAvailability, event: CourierStatusEvent): Promise<void> {
    if (this.statuses.get(courier.courierId) !== event.fromStatus) {
      throw new CourierError("CONFLICT", "Courier status just changed. Reload it and try again.");
    }
    this.statuses.set(courier.courierId, courier.status);
    this.events.push(event);
  }
}
