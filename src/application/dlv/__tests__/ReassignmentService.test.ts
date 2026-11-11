import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CourierStatus } from "../../../domain/dlv/states/CourierState.ts";
import { Order } from "../../../domain/ord/Order.ts";
import type { OrderStatus } from "../../../domain/ord/StateChangeEvent.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { InMemoryOrderRepository } from "../../ord/__tests__/fakes.ts";
import { DispatchService } from "../DispatchService.ts";
import { ReassignmentService } from "../ReassignmentService.ts";
import { InMemoryDispatchRepository } from "./dispatchFakes.ts";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes.ts";

const operator = { userId: "op-1", role: Role.OPERATOR };

let couriers: InMemoryCourierAvailabilityRepository;
let assignments: InMemoryAssignmentRepository;
let orders: InMemoryOrderRepository;
let dispatch: InMemoryDispatchRepository;
let service: ReassignmentService;

async function addOrder(id: number, status: OrderStatus) {
  await orders.add(Order.restore({
    id,
    restaurantId: "rest-a",
    customerId: "customer-1",
    lines: [{ menuItemId: 1, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
    placedAt: new Date(`2026-11-06T12:0${id}:00Z`),
    status,
    events: [],
  }));
}

function courierAt(id: string, lat: number, status: CourierStatus = "IDLE") {
  couriers.withCourier(id, status);
  dispatch.withCourierAt(id, lat, -73.5683);
}

async function stalled(courierStatus: CourierStatus = "OFFLINE", orderStatus: OrderStatus = "Ready") {
  await addOrder(7, orderStatus);
  courierAt("courier-1", 45.5131, courierStatus);
  assignments.withAssignment(7, "courier-1", "Accepted");
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  couriers = new InMemoryCourierAvailabilityRepository();
  assignments = new InMemoryAssignmentRepository(couriers);
  orders = new InMemoryOrderRepository();
  dispatch = new InMemoryDispatchRepository(couriers, assignments).withRestaurant("rest-a", 45.5131, -73.5683);
  service = new ReassignmentService(assignments, couriers, orders, new DispatchService(orders, assignments, dispatch));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReassignmentService.reassign", () => {
  it("releases the offline courier and offers the order to an idle one", async () => {
    await stalled();
    courierAt("courier-2", 45.5100);

    const result = await service.reassign(operator, 7);

    expect(result).toEqual({ orderId: 7, releasedCourierId: "courier-1", offeredTo: "courier-2" });
    expect(assignments.released).toEqual([expect.objectContaining({ orderId: 7, courierId: "courier-1" })]);
    expect(assignments.assignments.get(7)).toMatchObject({ courierId: "courier-2", status: "Offered" });
  });

  it("puts the order back in the queue when no courier is available", async () => {
    await stalled();

    const result = await service.reassign(operator, 7);

    expect(result.offeredTo).toBeNull();
    expect(await assignments.findActiveByOrderId(7)).toBeUndefined();
  });

  it("offers the order to the nearest idle courier", async () => {
    await stalled();
    courierAt("far", 45.5000);
    courierAt("near", 45.5120);

    const result = await service.reassign(operator, 7);

    expect(result.offeredTo).toBe("near");
  });

  it("skips an idle courier with no position", async () => {
    await stalled();
    couriers.withCourier("nowhere", "IDLE");
    courierAt("far", 45.5000);

    const result = await service.reassign(operator, 7);

    expect(result.offeredTo).toBe("far");
  });

  it.each<CourierStatus>(["IDLE", "ASSIGNED"])("refuses when the courier is still %s", async (status) => {
    await stalled(status);

    await expect(service.reassign(operator, 7)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(assignments.assignments.get(7)?.status).toBe("Accepted");
  });

  it("refuses once the order was picked up", async () => {
    await stalled("OFFLINE", "PickedUp");

    await expect(service.reassign(operator, 7)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("refuses an offer that was never accepted", async () => {
    await addOrder(7, "Ready");
    couriers.withCourier("courier-1", "OFFLINE");
    assignments.withAssignment(7, "courier-1", "Offered");

    await expect(service.reassign(operator, 7)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("reports an order with no courier", async () => {
    await expect(service.reassign(operator, 99)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each([Role.CUSTOMER, Role.RESTAURANT, Role.COURIER])("refuses a %s account", async (role) => {
    await stalled();

    await expect(service.reassign({ userId: "user-1", role }, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(assignments.released).toHaveLength(0);
  });

  it("refuses a missing session", async () => {
    await expect(service.reassign(null, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("ReassignmentService.listStalled", () => {
  it("lists accepted orders that are ready while their courier is offline", async () => {
    await stalled();

    expect(await service.listStalled(operator)).toEqual([{ orderId: 7, restaurantId: "rest-a", courierId: "courier-1" }]);
  });

  it.each<CourierStatus>(["IDLE", "ASSIGNED"])("leaves out an order whose courier is still %s", async (status) => {
    await stalled(status);

    expect(await service.listStalled(operator)).toEqual([]);
  });

  it("leaves out an order already picked up", async () => {
    await stalled("OFFLINE", "PickedUp");

    expect(await service.listStalled(operator)).toEqual([]);
  });

  it("leaves out an offer that was never accepted", async () => {
    await addOrder(7, "Ready");
    couriers.withCourier("courier-1", "OFFLINE");
    assignments.withAssignment(7, "courier-1", "Offered");

    expect(await service.listStalled(operator)).toEqual([]);
  });

  it("drops the order once it is reassigned", async () => {
    await stalled();

    await service.reassign(operator, 7);

    expect(await service.listStalled(operator)).toEqual([]);
  });

  it.each([Role.CUSTOMER, Role.RESTAURANT, Role.COURIER])("refuses a %s account", async (role) => {
    await expect(service.listStalled({ userId: "user-1", role })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
