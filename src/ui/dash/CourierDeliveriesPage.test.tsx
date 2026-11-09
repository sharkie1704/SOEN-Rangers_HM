import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CourierDeliveriesPage, {
  canConfirmDelivery,
  canConfirmPickup,
  type MockDeliveryOrder,
} from "./CourierDeliveriesPage";

const courier = { id: "courier-1", role: "COURIER" as const };

function order(status: MockDeliveryOrder["status"], assignedCourierId = courier.id): MockDeliveryOrder {
  return {
    id: 1042,
    restaurant: "Demo Bakery",
    itemSummary: "Chocolate brownie and cookies",
    status,
    assignedCourierId,
    assignmentAccepted: true,
  };
}

describe("courier delivery command eligibility", () => {
  it("allows pickup only for the assigned courier after the order is ready", () => {
    expect(canConfirmPickup(order("READY"), courier)).toBe(true);
    expect(canConfirmPickup(order("PREPARING"), courier)).toBe(false);
    expect(canConfirmPickup(order("READY", "courier-2"), courier)).toBe(false);
    expect(canConfirmPickup({ ...order("READY"), assignmentAccepted: false }, courier)).toBe(false);
    expect(canConfirmPickup(order("READY"), { id: "customer-1", role: "CUSTOMER" })).toBe(false);
  });

  it("allows delivery only for the assigned courier after pickup", () => {
    expect(canConfirmDelivery(order("PICKED_UP"), courier)).toBe(true);
    expect(canConfirmDelivery(order("READY"), courier)).toBe(false);
    expect(canConfirmDelivery(order("PICKED_UP", "courier-2"), courier)).toBe(false);
    expect(canConfirmDelivery({ ...order("PICKED_UP"), assignmentAccepted: false }, courier)).toBe(false);
    expect(canConfirmDelivery(order("PICKED_UP"), { id: "staff-1", role: "RESTAURANT" })).toBe(false);
  });

  it("renders mock commands with pickup and delivery disabled according to status", () => {
    const html = renderToStaticMarkup(createElement(CourierDeliveriesPage, { user: courier }));

    expect(html).toContain("Demo data");
    expect(html).toContain("not sent to the server");
    expect(html).toContain('<button type="button">Confirm Pickup</button>');
    expect(html).toContain('<button type="button" disabled="">Confirm Delivery</button>');
    expect(html).toContain('<button type="button" disabled="">Confirm Pickup</button>');
    expect(html).toContain("Restaurant is preparing the order");
  });

  it("does not render courier commands for another role", () => {
    const html = renderToStaticMarkup(
      createElement(CourierDeliveriesPage, { user: { id: "customer-1", role: "CUSTOMER" } }),
    );

    expect(html).toContain("Delivery commands are only available to couriers.");
    expect(html).not.toContain("Confirm Pickup");
    expect(html).not.toContain("Confirm Delivery");
  });
});
