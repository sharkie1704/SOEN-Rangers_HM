import type { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import { CourierError } from "../../domain/dlv/CourierError.ts";
import type { CourierStatus } from "../../domain/dlv/states/CourierState.ts";
import { hasPermission } from "../../domain/reg/permissions";
import type { Role } from "../../domain/reg/Role.ts";
import type { AssignmentRepository } from "./AssignmentRepository.ts";
import type { CourierAvailabilityRepository } from "./CourierAvailabilityRepository.ts";
import type { CourierIdleSubject } from "./CourierIdleSubject.ts";

export interface CourierActor {
  readonly userId: string;
  readonly role: Role;
}

export class CourierAvailabilityService {
  private readonly repository: CourierAvailabilityRepository;
  private readonly idle?: CourierIdleSubject;
  private readonly assignments?: Pick<AssignmentRepository, "findActiveByCourierId">;

  constructor(
    repository: CourierAvailabilityRepository,
    idle?: CourierIdleSubject,
    assignments?: Pick<AssignmentRepository, "findActiveByCourierId">,
  ) {
    this.repository = repository;
    this.idle = idle;
    this.assignments = assignments;
  }

  async get(actor: CourierActor | null): Promise<CourierAvailability> {
    return this.loadOwn(actor);
  }

  async goOnDuty(actor: CourierActor | null): Promise<{ courier: CourierAvailability; eventId: number }> {
    const courier = await this.loadOwn(actor);
    const active = await this.assignments?.findActiveByCourierId(courier.courierId);
    if (courier.status === "OFFLINE" && active?.status === "Accepted") {
      return this.record(courier, courier.resumeDelivery());
    }
    const result = await this.record(courier, courier.goOnDuty());
    await this.idle?.notify(courier.courierId);
    return result;
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
