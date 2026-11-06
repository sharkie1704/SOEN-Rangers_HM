import { beforeEach, describe, it, expect } from "vitest";
import { Assignment } from "../../../domain/dlv/Assignment.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { AssignmentService } from "../AssignmentService.ts";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes.ts";

const courier = { userId: "courier-1", role: Role.COURIER };

let couriers: InMemoryCourierAvailabilityRepository;
let repository: InMemoryAssignmentRepository;
let service: AssignmentService;

beforeEach(() => {
  couriers = new InMemoryCourierAvailabilityRepository().withCourier("courier-1", "IDLE");
  repository = new InMemoryAssignmentRepository(couriers);
  repository.assignments.set(7, new Assignment(7, "courier-1"));
  service = new AssignmentService(repository, couriers);
});

describe("AssignmentService.accept moves the courier", () => {
  it("moves the courier from idle to assigned and records the courier event", async () => {
    await service.accept(courier, 7);

    expect(couriers.statuses.get("courier-1")).toBe("ASSIGNED");
    expect(couriers.events).toEqual([expect.objectContaining({ courierId: "courier-1", fromStatus: "IDLE", toStatus: "ASSIGNED" })]);
  });

  it.each(["OFFLINE", "CARRYING"] as const)("refuses when the courier is %s", async (status) => {
    couriers.withCourier("courier-1", status);

    await expect(service.accept(courier, 7)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(couriers.statuses.get("courier-1")).toBe(status);
    expect(repository.accepted).toHaveLength(0);
  });

  it("leaves the courier alone on decline", async () => {
    await service.decline(courier, 7);

    expect(couriers.statuses.get("courier-1")).toBe("IDLE");
    expect(couriers.events).toHaveLength(0);
  });
});

describe("AssignmentService.accept", () => {
  it("accepts the courier's own offer and saves the event", async () => {
    const { assignment, eventId } = await service.accept(courier, 7);

    expect(assignment.status).toBe("Accepted");
    expect(eventId).toBe(1);
    expect(repository.accepted).toHaveLength(1);
    expect(repository.accepted[0]).toMatchObject({ eventId: 1, orderId: 7, courierId: "courier-1" });
  });

  it("refuses another courier", async () => {
    await expect(service.accept({ userId: "courier-2", role: Role.COURIER }, 7))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repository.assignments.get(7)?.status).toBe("Offered");
    expect(repository.accepted).toHaveLength(0);
  });

  it.each([Role.CUSTOMER, Role.RESTAURANT, Role.OPERATOR])("refuses a %s account", async (role) => {
    await expect(service.accept({ userId: "courier-1", role }, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repository.accepted).toHaveLength(0);
  });

  it("refuses a missing session", async () => {
    await expect(service.accept(null, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reports an order with no offer", async () => {
    await expect(service.accept(courier, 99)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuses an offer that was already accepted", async () => {
    await service.accept(courier, 7);

    await expect(service.accept(courier, 7)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(repository.accepted).toHaveLength(1);
  });

  it("reports a declined offer as gone", async () => {
    await service.decline(courier, 7);

    await expect(service.accept(courier, 7)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(repository.accepted).toHaveLength(0);
  });
});

describe("AssignmentService.decline", () => {
  it("declines the courier's own offer and saves the event", async () => {
    const { assignment, eventId } = await service.decline(courier, 7);

    expect(assignment.status).toBe("Declined");
    expect(eventId).toBe(1);
    expect(repository.declined).toHaveLength(1);
    expect(repository.declined[0]).toMatchObject({ eventId: 1, orderId: 7, courierId: "courier-1" });
    expect(repository.accepted).toHaveLength(0);
  });

  it("refuses another courier", async () => {
    await expect(service.decline({ userId: "courier-2", role: Role.COURIER }, 7))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repository.assignments.get(7)?.status).toBe("Offered");
    expect(repository.declined).toHaveLength(0);
  });

  it.each([Role.CUSTOMER, Role.RESTAURANT, Role.OPERATOR])("refuses a %s account", async (role) => {
    await expect(service.decline({ userId: "courier-1", role }, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repository.declined).toHaveLength(0);
  });

  it("refuses a missing session", async () => {
    await expect(service.decline(null, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reports an order with no offer", async () => {
    await expect(service.decline(courier, 99)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuses an offer that was already accepted", async () => {
    await service.accept(courier, 7);

    await expect(service.decline(courier, 7)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(repository.assignments.get(7)?.status).toBe("Accepted");
    expect(repository.declined).toHaveLength(0);
  });

  it("reports an offer that was already declined as gone", async () => {
    await service.decline(courier, 7);

    await expect(service.decline(courier, 7)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(repository.declined).toHaveLength(1);
  });
});
