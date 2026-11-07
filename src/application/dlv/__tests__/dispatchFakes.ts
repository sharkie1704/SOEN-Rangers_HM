import type { CourierCandidate, Position } from "../../../domain/dlv/DispatchRule.ts";
import type { DispatchRepository } from "../DispatchRepository.ts";
import type { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes.ts";

// Reads the other in-memory repositories, so candidates follow courier statuses and offers like the real query
export class InMemoryDispatchRepository implements DispatchRepository {
  readonly restaurants = new Map<string, Position>();
  readonly positions = new Map<string, Position>();

  constructor(
    private readonly couriers: InMemoryCourierAvailabilityRepository,
    private readonly assignments: InMemoryAssignmentRepository,
  ) {}

  withRestaurant(restaurantId: string, lat: number, lng: number): this {
    this.restaurants.set(restaurantId, { lat, lng });
    return this;
  }

  withCourierAt(courierId: string, lat: number, lng: number): this {
    this.positions.set(courierId, { lat, lng });
    return this;
  }

  async findRestaurantPosition(restaurantId: string): Promise<Position | undefined> {
    return this.restaurants.get(restaurantId);
  }

  async findCandidates(orderId: number): Promise<CourierCandidate[]> {
    const candidates: CourierCandidate[] = [];
    for (const [courierId, status] of this.couriers.statuses) {
      const position = this.positions.get(courierId);
      if (status !== "IDLE" || !position) continue;
      if (await this.assignments.findActiveByCourierId(courierId)) continue;
      if ((await this.assignments.findDeclinedOrderIds(courierId)).includes(orderId)) continue;
      candidates.push({ courierId, position });
    }
    return candidates;
  }
}
