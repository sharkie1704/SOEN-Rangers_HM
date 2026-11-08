import { beforeEach, describe, expect, it } from "vitest";
import type { WaitingOrder } from "../../../domain/dlv/DispatchQueue.ts";
import type { CourierStatus } from "../../../domain/dlv/states/CourierState.ts";
import { Order } from "../../../domain/ord/Order.ts";
import type { OrderStatus } from "../../../domain/ord/StateChangeEvent.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { InMemoryOrderRepository } from "../../ord/__tests__/fakes.ts";
import type { DispatchQueueRepository } from "../DispatchQueueRepository.ts";
import { DispatchQueueObserver } from "../DispatchQueueObserver.ts";
import { DispatchQueueService } from "../DispatchQueueService.ts";
import { ReassignmentService } from "../ReassignmentService.ts";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes.ts";

const operator = { userId: "op-1", role: Role.OPERATOR };

class ReadyOrdersQueue implements DispatchQueueRepository {
  constructor(private readonly orders: InMemoryOrderRepository, private readonly assignments: InMemoryAssignmentRepository) {}

  async listWaiting(): Promise<WaitingOrder[]> {
    const waiting: WaitingOrder[] = [];
    for (const order of await this.orders.findByRestaurant("rest-a")) {
      if (order.status === "Ready" && !(await this.assignments.findActiveByOrderId(order.id))) {
        waiting.push({ orderId: order.id, restaurantId: order.restaurantId, restaurantName: "Sweet Spot", readyAt: order.placedAt });
      }
    }
    return waiting;
  }
}

let couriers: InMemoryCourierAvailabilityRepository;
let assignments: InMemoryAssignmentRepository;
let orders: InMemoryOrderRepository;
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

async function stalled(courierStatus: CourierStatus = "OFFLINE", orderStatus: OrderStatus = "Ready") {
  await addOrder(7, orderStatus);
  couriers.withCourier("courier-1", courierStatus);
  assignments.withAssignment(7, "courier-1", "Accepted");
}

beforeEach(() => {
  couriers = new InMemoryCourierAvailabilityRepository();
  assignments = new InMemoryAssignmentRepository(couriers);
  orders = new InMemoryOrderRepository();
  const dispatch = new DispatchQueueObserver(new DispatchQueueService(new ReadyOrdersQueue(orders, assignments)), assignments, couriers);
  service = new ReassignmentService(assignments, couriers, orders, dispatch);
});

describe("ReassignmentService.reassign", () => {
  it("releases the offline courier and offers the order to an idle one", async () => {
    await stalled();
    couriers.withCourier("courier-2", "IDLE");

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

  it("keeps trying idle couriers until one gets this order", async () => {
    await addOrder(5, "Ready");
    await stalled();
    couriers.withCourier("courier-2", "IDLE").withCourier("courier-3", "IDLE");

    const result = await service.reassign(operator, 7);

    expect(assignments.assignments.get(5)?.courierId).toBe("courier-2");
    expect(result.offeredTo).toBe("courier-3");
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
