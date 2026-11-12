import type { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import { CourierError } from "../../domain/dlv/CourierError.ts";
import type { CourierStatus } from "../../domain/dlv/states/CourierState.ts";
import { hasPermission } from "../../domain/reg/permissions";
import type { Role } from "../../domain/reg/Role.ts";
import type { AssignmentRepository } from "./AssignmentRepository.ts";
import type { CourierAvailabilityRepository, CourierOverview } from "./CourierAvailabilityRepository.ts";
import type { CourierIdleSubject } from "./CourierIdleSubject.ts";

export interface CourierActor {
  readonly userId: string;
  readonly role: Role;
  readonly restaurantId?: string;
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

  async location(actor: CourierActor | null): Promise<{ lat: number; lng: number } | undefined> {
    const courier = await this.loadOwn(actor);
    return this.repository.findCourierLocation?.(courier.courierId);
  }

  async mapForRestaurant(actor: CourierActor | null, restaurantId: string) {
    if (!actor || actor.role !== "RESTAURANT" || actor.restaurantId !== restaurantId) {
      throw new CourierError("FORBIDDEN", "Only staff for this restaurant can view its on-duty couriers.");
    }
    return this.repository.findForRestaurantMap?.(restaurantId) ?? [];
  }

  // For the operator's map and dashboard: every courier's status, availability and position
  async overview(actor: CourierActor | null): Promise<CourierOverview[]> {
    if (!actor || !hasPermission({ name: "viewCouriers" }, { ...actor, id: actor.userId })) {
      throw new CourierError("FORBIDDEN", "Only an operator can view every courier.");
    }
    return this.repository.listOverview();
  }

  async goOnDuty(actor: CourierActor | null): Promise<{ courier: CourierAvailability; eventId: number }> {
    const courier = await this.loadOwn(actor);
    const active = await this.assignments?.findActiveByCourierId(courier.courierId);
    if (courier.status === "OFFLINE" && active?.status === "Accepted") {
      try {
        return await this.record(courier, courier.resumeDelivery(), true);
      } catch (error) {
        if (!(error instanceof CourierError && error.code === "CONFLICT")) throw error;
        // An operator reassigned the order meanwhile, so come back as an idle courier instead
        return this.becomeIdle(await this.loadOwn(actor));
      }
    }
    return this.becomeIdle(courier);
  }

  private async becomeIdle(courier: CourierAvailability): Promise<{ courier: CourierAvailability; eventId: number }> {
    const result = await this.record(courier, courier.goOnDuty());
    await this.idle?.notify(courier.courierId);
    return result;
  }

  async goOffDuty(actor: CourierActor | null): Promise<{ courier: CourierAvailability; eventId: number }> {
    const courier = await this.loadOwn(actor);
    return this.record(courier, courier.goOffDuty());
  }

  private async record(courier: CourierAvailability, fromStatus: CourierStatus, resumingDelivery = false) {
    const eventId = await this.repository.nextEventId();
    const event = {
      eventId,
      courierId: courier.courierId,
      actorId: courier.courierId,
      fromStatus,
      toStatus: courier.status,
      occurredAt: new Date(),
    };
    await (resumingDelivery ? this.repository.saveResumedDelivery(courier, event) : this.repository.save(courier, event));
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
