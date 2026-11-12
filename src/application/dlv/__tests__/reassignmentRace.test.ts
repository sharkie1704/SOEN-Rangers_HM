import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Assignment } from "../../../domain/dlv/Assignment.ts";
import { CourierAvailability } from "../../../domain/dlv/CourierAvailability.ts";
import { Order } from "../../../domain/ord/Order.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { InMemoryOrderRepository } from "../../ord/__tests__/fakes.ts";
import { CourierAvailabilityService } from "../CourierAvailabilityService.ts";
import { CourierIdleSubject } from "../CourierIdleSubject.ts";
import { DispatchService } from "../DispatchService.ts";
import { ReassignmentService } from "../ReassignmentService.ts";
import { InMemoryDispatchRepository } from "./dispatchFakes.ts";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes.ts";

// Casey accepted order 7, went off duty before pickup, and an operator and Casey now act at the same moment
const operator = { userId: "op-1", role: Role.OPERATOR };
const casey = { userId: "casey", role: Role.COURIER };

let couriers: InMemoryCourierAvailabilityRepository;
let assignments: InMemoryAssignmentRepository;
let announced: string[];
let availability: CourierAvailabilityService;
let reassignment: ReassignmentService;

beforeEach(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  couriers = new InMemoryCourierAvailabilityRepository().withCourier("casey", "OFFLINE").withCourier("other", "IDLE");
  assignments = new InMemoryAssignmentRepository(couriers).withAssignment(7, "casey", "Accepted");
  const orders = new InMemoryOrderRepository();
  await orders.add(Order.restore({
    id: 7,
    restaurantId: "rest-a",
    customerId: "customer-1",
    lines: [{ menuItemId: 1, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
    placedAt: new Date(),
    status: "Ready",
    events: [],
  }));
  const dispatch = new InMemoryDispatchRepository(couriers, assignments)
    .withRestaurant("rest-a", 45.5131, -73.5683)
    .withCourierAt("casey", 45.5131, -73.5684)
    .withCourierAt("other", 45.5100, -73.5683);
  const idle = new CourierIdleSubject();
  announced = [];
  idle.subscribe({ courierBecameIdle: async (id) => { announced.push(id); } });
  availability = new CourierAvailabilityService(couriers, idle, assignments);
  reassignment = new ReassignmentService(assignments, couriers, orders, new DispatchService(orders, assignments, dispatch));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Going back on duty while an operator reassigns the order", () => {
  it("comes back idle when the order was released after the courier looked it up", async () => {
    // Casey's request still sees the accepted order, but the release has already been saved
    vi.spyOn(assignments, "findActiveByCourierId").mockResolvedValueOnce(new Assignment(7, "casey", "Accepted"));
    assignments.withAssignment(7, "casey", "Released");

    const { courier } = await availability.goOnDuty(casey);

    expect(courier.status).toBe("IDLE");
    expect(couriers.statuses.get("casey")).toBe("IDLE");
    expect(couriers.events.map((e) => [e.fromStatus, e.toStatus])).toEqual([["OFFLINE", "IDLE"]]);
    expect(announced).toEqual(["casey"]);
  });

  it("keeps the order with the courier when they came back after the operator's check", async () => {
    // The operator's check still sees Casey offline, but Casey is already back with the order
    vi.spyOn(couriers, "findByCourierId").mockResolvedValueOnce(new CourierAvailability("casey", "OFFLINE"));
    couriers.withCourier("casey", "ASSIGNED");

    await expect(reassignment.reassign(operator, 7)).rejects.toMatchObject({ code: "CONFLICT" });

    expect(assignments.released).toEqual([]);
    expect(assignments.offered).toEqual([]);
    expect(couriers.statuses.get("casey")).toBe("ASSIGNED");
  });

  it("still reassigns normally when the courier stays offline", async () => {
    const result = await reassignment.reassign(operator, 7);
    expect(result).toMatchObject({ releasedCourierId: "casey", offeredTo: "other" });
  });

  it("still resumes the delivery normally when nothing was reassigned", async () => {
    expect((await availability.goOnDuty(casey)).courier.status).toBe("ASSIGNED");
    expect(announced).toEqual([]);
  });
});
