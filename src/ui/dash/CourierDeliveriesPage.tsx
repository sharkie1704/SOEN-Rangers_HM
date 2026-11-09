import { useState } from "react";
import type { AuthUser } from "../reg/auth/AuthContext";
import "./courier-deliveries.css";

export type MockDeliveryStatus = "PREPARING" | "READY" | "PICKED_UP" | "DELIVERED";

export interface MockDeliveryOrder {
  readonly id: number;
  readonly restaurant: string;
  readonly itemSummary: string;
  readonly status: MockDeliveryStatus;
  readonly assignedCourierId: string;
  readonly assignmentAccepted: boolean;
}

export function canConfirmPickup(order: MockDeliveryOrder, user: AuthUser): boolean {
  return user.role === "COURIER"
    && order.assignedCourierId === user.id
    && order.assignmentAccepted
    && order.status === "READY";
}

export function canConfirmDelivery(order: MockDeliveryOrder, user: AuthUser): boolean {
  return user.role === "COURIER"
    && order.assignedCourierId === user.id
    && order.assignmentAccepted
    && order.status === "PICKED_UP";
}

const statusLabels: Record<MockDeliveryStatus, string> = {
  PREPARING: "Restaurant is preparing the order",
  READY: "Ready for pickup",
  PICKED_UP: "Picked up",
  DELIVERED: "Delivered",
};

function createMockOrders(courierId: string): MockDeliveryOrder[] {
  return [
    {
      id: 1042,
      restaurant: "Demo Bakery",
      itemSummary: "Chocolate brownie and cookies",
      status: "READY",
      assignedCourierId: courierId,
      assignmentAccepted: true,
    },
    {
      id: 1043,
      restaurant: "Sweet Spot",
      itemSummary: "Strawberry cheesecake",
      status: "PREPARING",
      assignedCourierId: courierId,
      assignmentAccepted: true,
    },
  ];
}

export default function CourierDeliveriesPage({ user }: { user: AuthUser }) {
  const [orders, setOrders] = useState(() => createMockOrders(user.id));

  if (user.role !== "COURIER") {
    return (
      <section className="courier-deliveries" aria-label="Deliveries">
        <p role="alert">Delivery commands are only available to couriers.</p>
      </section>
    );
  }

  function updateOrder(orderId: number, status: MockDeliveryStatus) {
    setOrders((current) => current.map((order) => (
      order.id === orderId ? { ...order, status } : order
    )));
  }

  return (
    <section className="courier-deliveries" aria-label="My deliveries">
      <header className="courier-deliveries__header">
        <div>
          <h1>My deliveries</h1>
          <p>Confirm handoffs only when the assigned order reaches the matching status.</p>
        </div>
        <span className="courier-deliveries__demo">Demo data</span>
      </header>
      <p className="courier-deliveries__notice" role="note">
        These sample orders and actions are local to this page and are not sent to the server.
      </p>
      <div className="courier-deliveries__list">
        {orders.map((order) => {
          const pickupEnabled = canConfirmPickup(order, user);
          const deliveryEnabled = canConfirmDelivery(order, user);

          return (
            <article className="courier-deliveries__card" key={order.id}>
              <div className="courier-deliveries__details">
                <h2>Order #{order.id}</h2>
                <p><strong>{order.restaurant}</strong></p>
                <p>{order.itemSummary}</p>
                <p className="courier-deliveries__status" role="status">{statusLabels[order.status]}</p>
              </div>
              <div className="courier-deliveries__actions" aria-label={`Commands for order ${order.id}`}>
                <button
                  type="button"
                  disabled={!pickupEnabled}
                  onClick={() => updateOrder(order.id, "PICKED_UP")}
                >
                  Confirm Pickup
                </button>
                <button
                  type="button"
                  disabled={!deliveryEnabled}
                  onClick={() => updateOrder(order.id, "DELIVERED")}
                >
                  Confirm Delivery
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
