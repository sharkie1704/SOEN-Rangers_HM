import { beforeEach, describe, it, expect } from "vitest";
import { Assignment } from "../../../domain/dlv/Assignment.ts";
import { Role } from "../../../domain/reg/Role.ts";
import type { AssignmentRepository, OfferAcceptedEvent } from "../AssignmentRepository.ts";
import { AssignmentService } from "../AssignmentService.ts";

class FakeAssignments implements AssignmentRepository {
  readonly assignments = new Map<number, Assignment>();
  readonly saved: OfferAcceptedEvent[] = [];
  #eventId = 0;

  async nextEventId() {
    return ++this.#eventId;
  }

  async findByOrderId(orderId: number) {
    return this.assignments.get(orderId);
  }

  async saveAccepted(_assignment: Assignment, event: OfferAcceptedEvent) {
    this.saved.push(event);
  }
}

const courier = { userId: "courier-1", role: Role.COURIER };

describe("AssignmentService.accept", () => {
  let repository: FakeAssignments;
  let service: AssignmentService;

  beforeEach(() => {
    repository = new FakeAssignments();
    repository.assignments.set(7, new Assignment(7, "courier-1"));
    service = new AssignmentService(repository);
  });

  it("accepts the courier's own offer and saves the event", async () => {
    const { assignment, eventId } = await service.accept(courier, 7);

    expect(assignment.status).toBe("Accepted");
    expect(eventId).toBe(1);
    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0]).toMatchObject({ eventId: 1, orderId: 7, courierId: "courier-1" });
  });

  it("refuses another courier", async () => {
    await expect(service.accept({ userId: "courier-2", role: Role.COURIER }, 7))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repository.assignments.get(7)?.status).toBe("Offered");
    expect(repository.saved).toHaveLength(0);
  });

  it.each([Role.CUSTOMER, Role.RESTAURANT, Role.OPERATOR])("refuses a %s account", async (role) => {
    await expect(service.accept({ userId: "courier-1", role }, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repository.saved).toHaveLength(0);
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
    expect(repository.saved).toHaveLength(1);
  });
});
