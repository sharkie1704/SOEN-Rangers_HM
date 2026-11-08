import { beforeEach, describe, expect, it } from "vitest";
import type { WaitingOrder } from "../../../domain/dlv/DispatchQueue.ts";
import { Order } from "../../../domain/ord/Order.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { InMemoryOrderRepository } from "../../ord/__tests__/fakes.ts";
import { CourierAvailabilityService } from "../CourierAvailabilityService.ts";
import { CourierIdleSubject } from "../CourierIdleSubject.ts";
import type { DispatchQueueRepository } from "../DispatchQueueRepository.ts";
import { DispatchQueueObserver } from "../DispatchQueueObserver.ts";
import { DispatchQueueService } from "../DispatchQueueService.ts";
import { HandoffService } from "../HandoffService.ts";
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

let couriers: InMemoryCourierAvailabilityRepository;
let assignments: InMemoryAssignmentRepository;
let queue: FakeQueue;
let observer: DispatchQueueObserver;

beforeEach(() => {
  couriers = new InMemoryCourierAvailabilityRepository();
  assignments = new InMemoryAssignmentRepository(couriers);
  queue = new FakeQueue(assignments, [waiting(12, 10), waiting(10, 0), waiting(11, 5)]);
  observer = new DispatchQueueObserver(new DispatchQueueService(queue), assignments, couriers);
});

describe("DispatchQueueObserver", () => {
  it("offers the order that has waited longest to the idle courier", async () => {
    couriers.withCourier("courier-1", "IDLE");

    await observer.courierBecameIdle("courier-1");

    expect(assignments.assignments.get(10)).toMatchObject({ courierId: "courier-1", status: "Offered" });
    expect(assignments.offered).toEqual([expect.objectContaining({ orderId: 10, courierId: "courier-1" })]);
  });

  it("skips an order the courier already declined", async () => {
    couriers.withCourier("courier-1", "IDLE");
    assignments.withAssignment(10, "courier-1", "Declined");

    await observer.courierBecameIdle("courier-1");

    expect(assignments.offered).toEqual([expect.objectContaining({ orderId: 11 })]);
  });

  it("gives two idle couriers different orders", async () => {
    couriers.withCourier("courier-1", "IDLE").withCourier("courier-2", "IDLE");

    await observer.courierBecameIdle("courier-1");
    await observer.courierBecameIdle("courier-2");

    expect(assignments.offered.map((event) => [event.courierId, event.orderId])).toEqual([["courier-1", 10], ["courier-2", 11]]);
  });

  it.each(["OFFLINE", "ASSIGNED", "CARRYING"] as const)("does nothing when the courier is %s", async (status) => {
    couriers.withCourier("courier-1", status);

    await observer.courierBecameIdle("courier-1");

    expect(assignments.offered).toHaveLength(0);
  });

  it("does nothing when the courier already has an offer", async () => {
    couriers.withCourier("courier-1", "IDLE");
    assignments.withAssignment(99, "courier-1", "Offered");

    await observer.courierBecameIdle("courier-1");

    expect(assignments.offered).toHaveLength(0);
  });

  it("does nothing when the queue is empty", async () => {
    couriers.withCourier("courier-1", "IDLE");
    queue.waiting.length = 0;

    await observer.courierBecameIdle("courier-1");

    expect(assignments.offered).toHaveLength(0);
  });
});

describe("Courier side announces, queue answers", () => {
  let idle: CourierIdleSubject;

  beforeEach(() => {
    idle = new CourierIdleSubject();
    idle.subscribe(observer);
  });

  it("offers a waiting order as soon as a courier goes on duty", async () => {
    couriers.withCourier("courier-1", "OFFLINE");
    const availability = new CourierAvailabilityService(couriers, idle);

    await availability.goOnDuty({ userId: "courier-1", role: Role.COURIER });

    expect(assignments.offered).toEqual([expect.objectContaining({ orderId: 10, courierId: "courier-1" })]);
  });

  it("does not offer anything when a courier goes off duty", async () => {
    couriers.withCourier("courier-1", "IDLE");
    const availability = new CourierAvailabilityService(couriers, idle);

    await availability.goOffDuty({ userId: "courier-1", role: Role.COURIER });

    expect(assignments.offered).toHaveLength(0);
  });

  it("offers the next waiting order right after a delivery", async () => {
    const orders = new InMemoryOrderRepository();
    await orders.add(Order.restore({
      id: 7,
      restaurantId: "rest-a",
      customerId: "customer-1",
      lines: [{ menuItemId: 1, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
      placedAt: new Date("2026-11-06T11:00:00Z"),
      status: "PickedUp",
      events: [],
    }));
    couriers.withCourier("courier-1", "CARRYING");
    assignments.withAssignment(7, "courier-1", "Accepted");
    const handoff = new HandoffService(assignments, couriers, orders, idle);

    await handoff.deliver({ userId: "courier-1", role: Role.COURIER }, 7);

    expect(assignments.assignments.get(7)?.status).toBe("Completed");
    expect(assignments.offered).toEqual([expect.objectContaining({ orderId: 10, courierId: "courier-1" })]);
  });
});
