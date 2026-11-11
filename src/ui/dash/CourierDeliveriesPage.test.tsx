import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("./MapView", () => ({ default: () => null }));
import CourierDeliveriesPage, {
  canAcceptOffer,
  canConfirmDelivery,
  canConfirmPickup,
} from "./CourierDeliveriesPage";

const courier = { id: "courier-1", role: "COURIER" as const };

function delivery(
  status: "Ready" | "PickedUp" | "Preparing",
  assignmentStatus: "Offered" | "Accepted" = "Accepted",
  courierId = courier.id,
) {
  return {
    assignment: { orderId: 7, courierId, status: assignmentStatus },
    order: {
      id: 7,
      restaurantName: "Dessert Shop",
      status,
      lines: [{ menuItemId: 1, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
    },
  };
}

describe("courier delivery command eligibility", () => {
  it("allows accepting only the current courier's pending offer", () => {
    expect(canAcceptOffer(delivery("Ready", "Offered"), courier)).toBe(true);
    expect(canAcceptOffer(delivery("Ready", "Accepted"), courier)).toBe(false);
    expect(canAcceptOffer(delivery("Ready", "Offered", "courier-2"), courier)).toBe(false);
    expect(canAcceptOffer(delivery("Ready", "Offered"), { id: "customer-1", role: "CUSTOMER" })).toBe(false);
  });

  it("allows pickup only for the assigned courier on an accepted ready order", () => {
    expect(canConfirmPickup(delivery("Ready"), courier)).toBe(true);
    expect(canConfirmPickup(delivery("Preparing"), courier)).toBe(false);
    expect(canConfirmPickup(delivery("Ready", "Offered"), courier)).toBe(false);
    expect(canConfirmPickup(delivery("Ready", "Accepted", "courier-2"), courier)).toBe(false);
    expect(canConfirmPickup(delivery("Ready"), { id: "customer-1", role: "CUSTOMER" })).toBe(false);
  });

  it("allows delivery only for the assigned courier on an accepted picked-up order", () => {
    expect(canConfirmDelivery(delivery("PickedUp"), courier)).toBe(true);
    expect(canConfirmDelivery(delivery("Ready"), courier)).toBe(false);
    expect(canConfirmDelivery(delivery("PickedUp", "Offered"), courier)).toBe(false);
    expect(canConfirmDelivery(delivery("PickedUp", "Accepted", "courier-2"), courier)).toBe(false);
    expect(canConfirmDelivery(delivery("PickedUp"), { id: "staff-1", role: "RESTAURANT" })).toBe(false);
  });

  it("loads real courier deliveries instead of rendering hardcoded example orders", () => {
    const html = renderToStaticMarkup(createElement(CourierDeliveriesPage, { user: courier }));

    expect(html).toContain("Loading assigned deliveries…");
    expect(html).toContain("Refresh deliveries");
    expect(html).not.toContain("Demo data");
    expect(html).not.toContain("1042");
    expect(html).not.toContain("1043");
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
