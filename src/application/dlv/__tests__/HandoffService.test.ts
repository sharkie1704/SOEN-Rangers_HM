import { beforeEach, describe, expect, it } from "vitest";
import type { AssignmentStatus } from "../../../domain/dlv/Assignment.ts";
import type { CourierStatus } from "../../../domain/dlv/states/CourierState.ts";
import { Order } from "../../../domain/ord/Order.ts";
import type { OrderStatus } from "../../../domain/ord/StateChangeEvent.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { InMemoryOrderRepository } from "../../ord/__tests__/fakes.ts";
import { HandoffService } from "../HandoffService.ts";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes.ts";

const courier = { userId: "courier-1", role: Role.COURIER };

let couriers: InMemoryCourierAvailabilityRepository;
let assignments: InMemoryAssignmentRepository;
let orders: InMemoryOrderRepository;
let service: HandoffService;

async function setUp(orderStatus: OrderStatus, courierStatus: CourierStatus, assignmentStatus: AssignmentStatus = "Accepted") {
  couriers.withCourier("courier-1", courierStatus);
  assignments.withAssignment(7, "courier-1", assignmentStatus);
  await orders.add(Order.restore({
    id: 7,
    restaurantId: "rest-a",
    customerId: "customer-1",
    lines: [{ menuItemId: 1, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
    placedAt: new Date("2026-11-05T12:00:00Z"),
    status: orderStatus,
    events: [],
  }));
}

beforeEach(() => {
  couriers = new InMemoryCourierAvailabilityRepository();
  assignments = new InMemoryAssignmentRepository(couriers);
  orders = new InMemoryOrderRepository();
  service = new HandoffService(assignments, couriers, orders);
});

describe("HandoffService.pickUp", () => {
  it("moves the order to picked up and the courier to carrying", async () => {
    await setUp("Ready", "ASSIGNED");

    const { order } = await service.pickUp(courier, 7);

    expect(order.status).toBe("PickedUp");
    expect(order.events.at(-1)).toMatchObject({ action: "pick-up", actorId: "courier-1", from: "Ready", to: "PickedUp" });
    expect(couriers.statuses.get("courier-1")).toBe("CARRYING");
    expect(couriers.events).toEqual([expect.objectContaining({ fromStatus: "ASSIGNED", toStatus: "CARRYING" })]);
  });

  it("refuses an order that is not ready yet", async () => {
    await setUp("Preparing", "ASSIGNED");

    await expect(service.pickUp(courier, 7)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(couriers.statuses.get("courier-1")).toBe("ASSIGNED");
    expect(couriers.events).toHaveLength(0);
  });

  it("refuses an offer that was not accepted", async () => {
    await setUp("Ready", "IDLE", "Offered");

    await expect(service.pickUp(courier, 7)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect((await orders.findById(7))?.status).toBe("Ready");
  });

  it("refuses another courier", async () => {
    await setUp("Ready", "ASSIGNED");

    await expect(service.pickUp({ userId: "courier-2", role: Role.COURIER }, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await orders.findById(7))?.status).toBe("Ready");
  });

  it.each([Role.CUSTOMER, Role.RESTAURANT, Role.OPERATOR])("refuses a %s account", async (role) => {
    await setUp("Ready", "ASSIGNED");

    await expect(service.pickUp({ userId: "courier-1", role }, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a missing session", async () => {
    await setUp("Ready", "ASSIGNED");

    await expect(service.pickUp(null, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reports an order with no courier", async () => {
    await expect(service.pickUp(courier, 99)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("HandoffService.deliver", () => {
  it("delivers the order, frees the courier and completes the assignment", async () => {
    await setUp("PickedUp", "CARRYING");

    const { order } = await service.deliver(courier, 7);

    expect(order.status).toBe("Delivered");
    expect(order.events.at(-1)).toMatchObject({ action: "deliver", from: "PickedUp", to: "Delivered" });
    expect(couriers.statuses.get("courier-1")).toBe("IDLE");
    expect(couriers.events).toEqual([expect.objectContaining({ fromStatus: "CARRYING", toStatus: "IDLE" })]);
    expect(assignments.assignments.get(7)?.status).toBe("Completed");
    expect(assignments.completed).toEqual([expect.objectContaining({ orderId: 7, courierId: "courier-1" })]);
    expect(await assignments.findActiveByOrderId(7)).toBeUndefined();
  });

  it("refuses delivery before pickup", async () => {
    await setUp("Ready", "ASSIGNED");

    await expect(service.deliver(courier, 7)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(couriers.statuses.get("courier-1")).toBe("ASSIGNED");
    expect(assignments.assignments.get(7)?.status).toBe("Accepted");
    expect(assignments.completed).toHaveLength(0);
  });

  it("refuses another courier", async () => {
    await setUp("PickedUp", "CARRYING");

    await expect(service.deliver({ userId: "courier-2", role: Role.COURIER }, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(couriers.statuses.get("courier-1")).toBe("CARRYING");
  });

  it("runs the whole trip from pickup to delivery", async () => {
    await setUp("Ready", "ASSIGNED");

    await service.pickUp(courier, 7);
    const { order, courier: freed } = await service.deliver(courier, 7);

    expect(order.events.map((event) => event.action)).toEqual(["pick-up", "deliver"]);
    expect(freed.status).toBe("IDLE");
  });
});
