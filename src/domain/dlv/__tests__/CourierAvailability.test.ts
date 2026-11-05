import { describe, expect, it } from "vitest";
import { CourierAvailability } from "../CourierAvailability.ts";
import type { CourierStatus } from "../states/CourierState.ts";

type Action = "goOnDuty" | "goOffDuty" | "assign" | "unassign" | "pickUp" | "completeDelivery";

const allowed: [CourierStatus, Action, CourierStatus][] = [
  ["OFFLINE", "goOnDuty", "IDLE"],
  ["IDLE", "goOffDuty", "OFFLINE"],
  ["IDLE", "assign", "ASSIGNED"],
  ["ASSIGNED", "unassign", "IDLE"],
  ["ASSIGNED", "pickUp", "CARRYING"],
  ["CARRYING", "completeDelivery", "IDLE"],
];

const statuses: CourierStatus[] = ["OFFLINE", "IDLE", "ASSIGNED", "CARRYING"];
const actions: Action[] = ["goOnDuty", "goOffDuty", "assign", "unassign", "pickUp", "completeDelivery"];
const refused = statuses.flatMap((status) => actions
  .filter((action) => !allowed.some(([from, allowedAction]) => from === status && allowedAction === action))
  .map((action): [CourierStatus, Action] => [status, action]));

describe("CourierAvailability", () => {
  it("starts offline", () => {
    expect(new CourierAvailability("courier-1").status).toBe("OFFLINE");
  });

  it("requires a courier ID", () => {
    expect(() => new CourierAvailability(" ")).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
  });

  it.each(allowed)("from %s, %s moves to %s and returns the previous status", (from, action, to) => {
    const courier = new CourierAvailability("courier-1", from);
    expect(courier[action]()).toBe(from);
    expect(courier.status).toBe(to);
  });

  it.each(refused)("from %s, %s is refused and leaves the status alone", (from, action) => {
    const courier = new CourierAvailability("courier-1", from);
    expect(() => courier[action]()).toThrow(expect.objectContaining({ code: "INVALID_TRANSITION" }));
    expect(courier.status).toBe(from);
  });

  it("explains why a courier carrying an order cannot go offline", () => {
    expect(() => new CourierAvailability("courier-1", "CARRYING").goOffDuty()).toThrow("while carrying an order");
  });

  it("explains why an assigned courier cannot go offline", () => {
    expect(() => new CourierAvailability("courier-1", "ASSIGNED").goOffDuty()).toThrow("while assigned to an order");
  });

  it("completes a full delivery cycle", () => {
    const courier = new CourierAvailability("courier-1");
    courier.goOnDuty();
    courier.assign();
    courier.pickUp();
    courier.completeDelivery();
    courier.goOffDuty();
    expect(courier.status).toBe("OFFLINE");
  });
});
