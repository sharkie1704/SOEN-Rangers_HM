import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Assignment } from "../../../domain/dlv/Assignment.ts";
import { AssignmentError } from "../../../domain/dlv/AssignmentError.ts";
import { Order } from "../../../domain/ord/Order.ts";
import type { OrderStatus } from "../../../domain/ord/StateChangeEvent.ts";
import { InMemoryOrderRepository } from "../../ord/__tests__/fakes.ts";
import type { AssignmentChangeEvent } from "../AssignmentRepository.ts";
import { DispatchService } from "../DispatchService.ts";
import { InMemoryDispatchRepository } from "./dispatchFakes.ts";
import { InMemoryAssignmentRepository, InMemoryCourierAvailabilityRepository } from "./fakes.ts";

const SWEET_SPOT = "sweet-spot";

let orders: InMemoryOrderRepository;
let couriers: InMemoryCourierAvailabilityRepository;
let assignments: InMemoryAssignmentRepository;
let dispatch: InMemoryDispatchRepository;
let service: DispatchService;

async function addOrder(id: number, status: OrderStatus = "Ready", restaurantId = SWEET_SPOT) {
  await orders.add(Order.restore({
    id,
    restaurantId,
    customerId: "customer-1",
    lines: [{ menuItemId: 1, name: "Macaron", quantity: 1, unitPriceCents: 350 }],
    placedAt: new Date(),
    status,
    events: [],
  }));
}

function courierAt(id: string, lat: number, lng: number, status: "OFFLINE" | "IDLE" | "ASSIGNED" | "CARRYING" = "IDLE") {
  couriers.withCourier(id, status);
  dispatch.withCourierAt(id, lat, lng);
}

beforeEach(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  orders = new InMemoryOrderRepository();
  couriers = new InMemoryCourierAvailabilityRepository();
  assignments = new InMemoryAssignmentRepository(couriers);
  dispatch = new InMemoryDispatchRepository(couriers, assignments).withRestaurant(SWEET_SPOT, 45.5131, -73.5683);
  service = new DispatchService(orders, assignments, dispatch);
  await addOrder(7);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DispatchService.offer", () => {
  it("offers a ready order to the nearest idle courier and records the event", async () => {
    courierAt("far", 45.5017, -73.5673);
    courierAt("near", 45.5125, -73.5690);

    const assignment = await service.offer(7);

    expect(assignment).toMatchObject({ orderId: 7, courierId: "near", status: "Offered" });
    expect(await assignments.findActiveByCourierId("near")).toBe(assignment);
    expect(assignments.offered).toEqual([{ eventId: 1, orderId: 7, courierId: "near", occurredAt: expect.any(Date) }]);
  });

  it("leaves the courier idle until they accept", async () => {
    courierAt("near", 45.5125, -73.5690);
    await service.offer(7);
    expect(couriers.statuses.get("near")).toBe("IDLE");
  });

  it("gives a tie to the lowest courier ID", async () => {
    courierAt("44444444-4444-4444-8444-444444444444", 45.5131, -73.5653);
    courierAt("33333333-3333-4333-8333-333333333333", 45.5131, -73.5713);
    expect((await service.offer(7))?.courierId).toBe("33333333-3333-4333-8333-333333333333");
  });

  it.each(["OFFLINE", "ASSIGNED", "CARRYING"] as const)("skips a nearer courier who is %s", async (status) => {
    courierAt("busy", 45.5131, -73.5684, status);
    courierAt("free", 45.5017, -73.5673);
    expect((await service.offer(7))?.courierId).toBe("free");
  });

  it("skips a nearer courier who already has an offer", async () => {
    await addOrder(8);
    courierAt("offered", 45.5131, -73.5684);
    courierAt("free", 45.5017, -73.5673);
    assignments.withAssignment(8, "offered");
    expect((await service.offer(7))?.courierId).toBe("free");
  });

  it("skips a nearer courier who already declined this order", async () => {
    courierAt("decliner", 45.5131, -73.5684);
    courierAt("free", 45.5017, -73.5673);
    assignments.withAssignment(7, "decliner", "Declined");
    expect((await service.offer(7))?.courierId).toBe("free");
  });

  it("skips idle couriers without a position", async () => {
    couriers.withCourier("nowhere", "IDLE");
    courierAt("free", 45.5017, -73.5673);
    expect((await service.offer(7))?.courierId).toBe("free");
  });

  it("leaves the order waiting when no courier is free", async () => {
    courierAt("offline", 45.5131, -73.5684, "OFFLINE");
    expect(await service.offer(7)).toBeUndefined();
    expect(assignments.offered).toEqual([]);
  });

  it("leaves the order waiting when its restaurant has no position", async () => {
    await addOrder(9, "Ready", "no-position");
    courierAt("free", 45.5017, -73.5673);
    expect(await service.offer(9)).toBeUndefined();
    expect(assignments.offered).toEqual([]);
  });

  it("returns the existing offer instead of making a second one", async () => {
    courierAt("first", 45.5131, -73.5684);
    courierAt("second", 45.5017, -73.5673);
    const first = await service.offer(7);
    expect(await service.offer(7)).toBe(first);
    expect(assignments.offered).toHaveLength(1);
  });

  it.each(["Placed", "Accepted", "Preparing", "PickedUp", "Delivered", "Rejected", "Cancelled"] as const)(
    "refuses an order that is %s",
    async (status) => {
      await addOrder(10, status);
      courierAt("free", 45.5017, -73.5673);
      await expect(service.offer(10)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
      expect(assignments.offered).toEqual([]);
    },
  );

  it("reports a missing order", async () => {
    await expect(service.offer(99)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("moves on to the next courier when the nearest one is taken mid-offer", async () => {
    await addOrder(8);
    courierAt("near", 45.5131, -73.5684);
    courierAt("next", 45.5017, -73.5673);
    const saveOffer = assignments.saveOffer.bind(assignments);
    vi.spyOn(assignments, "saveOffer").mockImplementationOnce(async (assignment: Assignment, event: AssignmentChangeEvent) => {
      // Another order grabs the same courier between the candidate query and this save
      await saveOffer(new Assignment(8, "near"), { ...event, orderId: 8 });
      return saveOffer(assignment, event);
    });

    expect((await service.offer(7))?.courierId).toBe("next");
    expect((await assignments.findActiveByOrderId(8))?.courierId).toBe("near");
  });

  it("stops when another offer takes the order mid-offer", async () => {
    courierAt("near", 45.5131, -73.5684);
    courierAt("next", 45.5017, -73.5673);
    const saveOffer = assignments.saveOffer.bind(assignments);
    vi.spyOn(assignments, "saveOffer").mockImplementationOnce(async (assignment: Assignment, event: AssignmentChangeEvent) => {
      await saveOffer(new Assignment(7, "next"), event);
      return saveOffer(assignment, event);
    });

    expect((await service.offer(7))?.courierId).toBe("next");
    expect(assignments.offered).toHaveLength(1);
  });

  it("passes on errors that are not offer conflicts", async () => {
    courierAt("near", 45.5131, -73.5684);
    vi.spyOn(assignments, "saveOffer").mockRejectedValueOnce(new Error("database is down"));
    await expect(service.offer(7)).rejects.toThrow("database is down");
  });
  it("skips a courier who went off duty after being picked, and offers the next nearest", async () => {
    courierAt("near", 45.5125, -73.5690);
    courierAt("far", 45.5017, -73.5673);
    const findCandidates = dispatch.findCandidates.bind(dispatch);
    vi.spyOn(dispatch, "findCandidates").mockImplementation(async (orderId) => {
      const candidates = await findCandidates(orderId);
      couriers.withCourier("near", "OFFLINE");
      return candidates;
    });

    const assignment = await service.offer(7);

    expect(assignment).toMatchObject({ orderId: 7, courierId: "far" });
    expect(await assignments.findActiveByCourierId("near")).toBeUndefined();
  });
});

describe("DispatchService.orderReady", () => {
  it("offers the order", async () => {
    courierAt("near", 45.5131, -73.5684);
    await service.orderReady(7);
    expect((await assignments.findActiveByOrderId(7))?.courierId).toBe("near");
  });

  it("logs a failure instead of throwing, so the order stays in the dispatch queue", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    courierAt("near", 45.5131, -73.5684);
    vi.spyOn(assignments, "saveOffer").mockRejectedValueOnce(new AssignmentError("INVALID_INPUT", "broken"));

    await expect(service.orderReady(7)).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalledOnce();
    expect(await assignments.findActiveByOrderId(7)).toBeUndefined();
  });
});
