import type { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import { CourierError } from "../../domain/dlv/CourierError.ts";
import type { CourierStatus } from "../../domain/dlv/states/CourierState.ts";
import { hasPermission } from "../../domain/reg/permissions";
import type { Role } from "../../domain/reg/Role.ts";
import type { CourierAvailabilityRepository } from "./CourierAvailabilityRepository.ts";

export interface CourierActor {
  readonly userId: string;
  readonly role: Role;
}

export class CourierAvailabilityService {
  private readonly repository: CourierAvailabilityRepository;

  constructor(repository: CourierAvailabilityRepository) {
    this.repository = repository;
  }

  async get(actor: CourierActor | null): Promise<CourierAvailability> {
    return this.loadOwn(actor);
  }

  async goOnDuty(actor: CourierActor | null): Promise<{ courier: CourierAvailability; eventId: number }> {
    const courier = await this.loadOwn(actor);
    return this.record(courier, courier.goOnDuty());
  }

  async goOffDuty(actor: CourierActor | null): Promise<{ courier: CourierAvailability; eventId: number }> {
    const courier = await this.loadOwn(actor);
    return this.record(courier, courier.goOffDuty());
  }

  private async record(courier: CourierAvailability, fromStatus: CourierStatus) {
    const eventId = await this.repository.nextEventId();
    await this.repository.save(courier, {
      eventId,
      courierId: courier.courierId,
      actorId: courier.courierId,
      fromStatus,
      toStatus: courier.status,
      occurredAt: new Date(),
    });
    return { courier, eventId };
  }

  // The courier ID always comes from the session, so couriers can only reach their own availability
  private async loadOwn(actor: CourierActor | null): Promise<CourierAvailability> {
    if (!actor || !hasPermission({ name: "manageCourierAvailability", courierId: actor.userId }, { ...actor, id: actor.userId })) {
      throw new CourierError("FORBIDDEN", "Only couriers can manage their availability.");
    }
    const courier = await this.repository.findByCourierId(actor.userId);
    if (!courier) {
      throw new CourierError("NOT_FOUND", "Courier was not found.");
    }
    return courier;
  }
}
