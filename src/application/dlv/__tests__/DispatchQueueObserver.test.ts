import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WaitingOrder } from "../../../domain/dlv/DispatchQueue.ts";
import type { CourierStatus } from "../../../domain/dlv/states/CourierState.ts";
import { Order } from "../../../domain/ord/Order.ts";
import type { OrderStatus } from "../../../domain/ord/StateChangeEvent.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { InMemoryOrderRepository } from "../../ord/__tests__/fakes.ts";
import { CourierAvailabilityService } from "../CourierAvailabilityService.ts";
import { CourierIdleSubject } from "../CourierIdleSubject.ts";
import type { DispatchQueueRepository } from "../DispatchQueueRepository.ts";
import { DispatchQueueObserver } from "../DispatchQueueObserver.ts";
import { DispatchQueueService } from "../DispatchQueueService.ts";
import { DispatchService } from "../DispatchService.ts";
import { HandoffService } from "../HandoffService.ts";
import { InMemoryDispatchRepository } from "./dispatchFakes.ts";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes.ts";

class FakeQueue implements DispatchQueueRepository {
  constructor(private readonly assignments: InMemoryAssignmentRepository, readonly waiting: WaitingOrder[] = []) {}

  async listWaiting() {
    const stillWaiting: WaitingOrder[] = [];
    for (const entry of this.waiting) {
      if (!(await this.assignments.findActiveByOrderId(entry.orderId))) stillWaiting.push(entry);
    }
    return stillWaiting;
  }
}

function waiting(orderId: number, minute: number): WaitingOrder {
  return { orderId, restaurantId: "rest-a", restaurantName: "Sweet Spot", readyAt: new Date(`2026-11-06T12:${String(minute).padStart(2, "0")}:00Z`) };
}

let orders: InMemoryOrderRepository;
let couriers: InMemoryCourierAvailabilityRepository;
let assignments: InMemoryAssignmentRepository;
let dispatch: InMemoryDispatchRepository;
let queue: FakeQueue;
let observer: DispatchQueueObserver;

async function addOrder(id: number, status: OrderStatus = "Ready") {
  await orders.add(Order.restore({
    id,
    restaurantId: "rest-a",
    customerId: "customer-1",
    lines: [{ menuItemId: 1, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
    placedAt: new Date("2026-11-06T11:00:00Z"),
    status,
    events: [],
  }));
}

function courierAt(id: string, lat: number, status: CourierStatus = "IDLE") {
  couriers.withCourier(id, status);
  dispatch.withCourierAt(id, lat, -73.5683);
}

function offers() {
  return assignments.offered.map((event) => [event.orderId, event.courierId]);
}

beforeEach(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  orders = new InMemoryOrderRepository();
  couriers = new InMemoryCourierAvailabilityRepository();
  assignments = new InMemoryAssignmentRepository(couriers);
  dispatch = new InMemoryDispatchRepository(couriers, assignments).withRestaurant("rest-a", 45.5131, -73.5683);
  queue = new FakeQueue(assignments, [waiting(12, 10), waiting(10, 0), waiting(11, 5)]);
  observer = new DispatchQueueObserver(new DispatchQueueService(queue), new DispatchService(orders, assignments, dispatch));
  for (const id of [10, 11, 12]) await addOrder(id);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DispatchQueueObserver", () => {
  it("gives the longest-waiting order to the nearest free courier, not the one who just became idle", async () => {
    courierAt("near", 45.5130);
    courierAt("far", 45.5000);

    await observer.courierBecameIdle("far");

    expect(offers()).toEqual([[10, "near"], [11, "far"]]);
  });

  it("leaves orders waiting once every free courier has an offer", async () => {
    courierAt("courier-1", 45.5130);

    await observer.courierBecameIdle("courier-1");

    expect(offers()).toEqual([[10, "courier-1"]]);
    expect((await queue.listWaiting()).map((entry) => entry.orderId)).toEqual([12, 11]);
  });

  it("skips a courier with no position", async () => {
    couriers.withCourier("nowhere", "IDLE");

    await observer.courierBecameIdle("nowhere");

    expect(offers()).toEqual([]);
  });

  it("gives an order the courier declined to the next nearest one", async () => {
    courierAt("near", 45.5130);
    courierAt("far", 45.5000);
    assignments.withAssignment(10, "near", "Declined");

    await observer.courierBecameIdle("near");

    expect(offers()).toEqual([[10, "far"], [11, "near"]]);
  });

  it.each<CourierStatus>(["OFFLINE", "ASSIGNED", "CARRYING"])("does not offer to a %s courier", async (status) => {
    courierAt("courier-1", 45.5130, status);

    await observer.courierBecameIdle("courier-1");

    expect(offers()).toEqual([]);
  });

  it("does nothing when the queue is empty", async () => {
    courierAt("courier-1", 45.5130);
    queue.waiting.length = 0;

    await observer.courierBecameIdle("courier-1");

    expect(offers()).toEqual([]);
  });

  it("keeps going when one waiting order cannot be offered", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    courierAt("courier-1", 45.5130);
    queue.waiting.unshift(waiting(99, 0));

    await observer.courierBecameIdle("courier-1");

    expect(offers()).toEqual([[10, "courier-1"]]);
    expect(error).toHaveBeenCalledOnce();
  });
});

describe("Courier side announces, queue answers", () => {
  let idle: CourierIdleSubject;

  beforeEach(() => {
    idle = new CourierIdleSubject();
    idle.subscribe(observer);
  });

  it("offers a waiting order as soon as a courier goes on duty", async () => {
    courierAt("courier-1", 45.5130, "OFFLINE");

    await new CourierAvailabilityService(couriers, idle).goOnDuty({ userId: "courier-1", role: Role.COURIER });

    expect(offers()).toEqual([[10, "courier-1"]]);
  });

  it("does not offer anything when a courier goes off duty", async () => {
    courierAt("courier-1", 45.5130);

    await new CourierAvailabilityService(couriers, idle).goOffDuty({ userId: "courier-1", role: Role.COURIER });

    expect(offers()).toEqual([]);
  });

  it("offers the next waiting order right after a delivery", async () => {
    await addOrder(7, "PickedUp");
    courierAt("courier-1", 45.5130, "CARRYING");
    assignments.withAssignment(7, "courier-1", "Accepted");

    await new HandoffService(assignments, couriers, orders, idle).deliver({ userId: "courier-1", role: Role.COURIER }, 7);

    expect(assignments.assignments.get(7)?.status).toBe("Completed");
    expect(offers()).toEqual([[10, "courier-1"]]);
  });
});
