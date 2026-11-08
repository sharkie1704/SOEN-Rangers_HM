import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "../../../domain/reg/Role.ts";
import type { OrderReadyListener } from "../../ord/OrderReadyListener.ts";
import { AssignmentService } from "../AssignmentService.ts";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes.ts";

const courier = { userId: "courier-1", role: Role.COURIER };

let assignments: InMemoryAssignmentRepository;
let readyAgain: number[];
let service: AssignmentService;

beforeEach(() => {
  const couriers = new InMemoryCourierAvailabilityRepository().withCourier("courier-1", "IDLE");
  assignments = new InMemoryAssignmentRepository(couriers).withAssignment(7, "courier-1");
  readyAgain = [];
  const listener: OrderReadyListener = { orderReady: async (orderId) => { readyAgain.push(orderId); } };
  service = new AssignmentService(assignments, couriers, listener);
});

describe("AssignmentService redispatch", () => {
  it("hands a declined order back for another courier", async () => {
    await service.decline(courier, 7);
    expect(readyAgain).toEqual([7]);
  });

  it("does not hand back an accepted order", async () => {
    await service.accept(courier, 7);
    expect(readyAgain).toEqual([]);
  });

  it("does not hand back an order when the decline is refused", async () => {
    await expect(service.decline({ userId: "courier-2", role: Role.COURIER }, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(readyAgain).toEqual([]);
  });
});
