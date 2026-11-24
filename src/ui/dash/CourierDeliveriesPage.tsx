import { useState } from "react";
import type { OrderDTO } from "../../application/ord/OrderDTO.ts";
import { api } from "../reg/api/client";
import { errorMessage, useApi } from "../reg/api/useApi";
import type { AuthUser } from "../reg/auth/AuthContext";
import MapView, { type MapCourier, type MapRestaurant } from "./MapView";
import "./courier-deliveries.css";

type AssignmentStatus = "Offered" | "Accepted" | "Declined" | "Completed" | "Released";
type DeliveryOrderStatus = OrderDTO["status"];

interface CourierDelivery {
  readonly assignment: {
    readonly orderId: number;
    readonly courierId: string;
    readonly status: AssignmentStatus;
  };
  readonly order: Pick<OrderDTO, "id" | "restaurantName" | "status" | "lines">;
  readonly restaurantLocation?: { lat: number; lng: number };
  readonly customerLocation?: { lat: number; lng: number };
}

type DeliveryAction = "accept" | "decline" | "pickup" | "deliver";
type CourierAvailabilityResponse = { courier: { status: MapCourier["status"]; location?: { lat: number; lng: number } } };

const statusLabels: Record<DeliveryOrderStatus, string> = {
  Placed: "Order placed",
  Accepted: "Restaurant accepted the order",
  Preparing: "Restaurant is preparing the order",
  Ready: "Ready for pickup",
  PickedUp: "Picked up",
  Delivered: "Delivered",
  Refunded: "Refunded",
  Rejected: "Rejected",
  Cancelled: "Cancelled",
};

function ownsDelivery(delivery: CourierDelivery, user: AuthUser): boolean {
  return user.role === "COURIER" && delivery.assignment.courierId === user.id;
}

export function canAcceptOffer(delivery: CourierDelivery, user: AuthUser): boolean {
  return ownsDelivery(delivery, user) && delivery.assignment.status === "Offered";
}

export function canConfirmPickup(delivery: CourierDelivery, user: AuthUser): boolean {
  return ownsDelivery(delivery, user)
    && delivery.assignment.status === "Accepted"
    && delivery.order.status === "Ready";
}

export function canConfirmDelivery(delivery: CourierDelivery, user: AuthUser): boolean {
  return ownsDelivery(delivery, user)
    && delivery.assignment.status === "Accepted"
    && delivery.order.status === "PickedUp";
}

export default function CourierDeliveriesPage({ user }: { user: AuthUser }) {
  const courierMarker = (availability: CourierAvailabilityResponse): MapCourier | null => availability.courier.location
    ? { id: user.id, name: user.name ?? "You", status: availability.courier.status, ...availability.courier.location }
    : null;

  const resource = useApi(async () => {
    if (user.role !== "COURIER") return { deliveries: [], courierLocation: null };
    const [response, availability] = await Promise.all([
      api<{ deliveries: CourierDelivery[] }>("/api/couriers/me/deliveries"),
      api<CourierAvailabilityResponse>("/api/couriers/me/availability"),
    ]);
    return { deliveries: response.deliveries, courierLocation: courierMarker(availability) };
  }, "Could not load your assigned deliveries.", [user.id, user.role]);
  const deliveries = resource.data?.deliveries ?? [];
  const courierLocation = resource.data?.courierLocation ?? null;
  const { loading, error: loadError, reload } = resource;
  const [pendingAction, setPendingAction] = useState<{ orderId: number; action: DeliveryAction } | null>(null);
  const [actionError, setActionError] = useState("");

  function setDeliveries(update: (current: CourierDelivery[]) => CourierDelivery[]) {
    resource.setData((current) => current && { ...current, deliveries: update(current.deliveries) });
  }

  function setCourierLocation(location: MapCourier | null) {
    resource.setData((current) => current && { ...current, courierLocation: location });
  }

  async function runAction(delivery: CourierDelivery, action: DeliveryAction) {
    if (pendingAction !== null) return;
    if (action === "accept" && !canAcceptOffer(delivery, user)) return;
    if (action === "pickup" && !canConfirmPickup(delivery, user)) return;
    if (action === "deliver" && !canConfirmDelivery(delivery, user)) return;
    if (action === "decline" && !canAcceptOffer(delivery, user)) return;

    setPendingAction({ orderId: delivery.order.id, action });
    setActionError("");
    try {
      if (action === "accept" || action === "decline") {
        const response = await api<{ assignment: { status: AssignmentStatus } }>(
          `/api/orders/${delivery.order.id}/offer/${action}`,
          { method: "POST" },
        );
        if (action === "decline") {
          setDeliveries((current) => current.filter((entry) => entry.order.id !== delivery.order.id));
        } else {
          setDeliveries((current) => current.map((entry) => (
            entry.order.id === delivery.order.id
              ? { ...entry, assignment: { ...entry.assignment, status: response.assignment.status } }
              : entry
          )));
        }
      } else {
        const response = await api<{ order: { id: number; status: DeliveryOrderStatus } }>(
          `/api/orders/${delivery.order.id}/${action}`,
          { method: "POST" },
        );
        setDeliveries((current) => current.map((entry) => (
          entry.order.id === response.order.id
            ? {
              ...entry,
              order: { ...entry.order, status: response.order.status },
              ...(action === "deliver"
                ? { assignment: { ...entry.assignment, status: "Completed" as const } }
                : {}),
            }
            : entry
        )));
        if (action === "pickup" || action === "deliver") {
          try {
            setCourierLocation(courierMarker(await api<CourierAvailabilityResponse>("/api/couriers/me/availability")));
          } catch {
            // The handoff already succeeded; keep the current marker if its refresh fails.
          }
        }
      }
    } catch (cause) {
      setActionError(errorMessage(cause, "The delivery action could not be completed."));
    } finally {
      setPendingAction(null);
    }
  }

  const activeDelivery = deliveries.find((delivery) =>
    delivery.assignment.status === "Accepted" && delivery.order.status !== "Delivered",
  );
  const activeRestaurant: MapRestaurant | null = activeDelivery?.restaurantLocation
    ? {
      id: `pickup-${activeDelivery.order.id}`,
      name: activeDelivery.order.restaurantName,
      lat: activeDelivery.restaurantLocation.lat,
      lng: activeDelivery.restaurantLocation.lng,
      status: "OPEN",
      queue: { length: 0 },
    }
    : null;
  const pickedUp = activeDelivery?.order.status === "PickedUp";

  if (user.role !== "COURIER") {
    return (
      <section className="courier-deliveries" aria-label="Deliveries">
        <p role="alert">Delivery commands are only available to couriers.</p>
      </section>
    );
  }

  return (
    <section className="courier-deliveries" aria-label="My deliveries">
      <header className="courier-deliveries__header">
        <div>
          <h1>My deliveries</h1>
          <p>Offers and active deliveries assigned to your courier account.</p>
        </div>
        <button
          type="button"
          className="courier-deliveries__refresh"
          disabled={loading || pendingAction !== null}
          onClick={reload}
        >
          Refresh deliveries
        </button>
      </header>
      {activeRestaurant && (
        <div style={{ height: "360px", marginBottom: "24px", border: "1px solid #EADBC8", borderRadius: "12px", overflow: "hidden" }}>
          <MapView
            restaurants={[activeRestaurant]}
            couriers={courierLocation ? [courierLocation] : []}
            showLabels
            selectedRestaurantId={null}
            onSelectRestaurant={() => undefined}
            deliveryPin={pickedUp ? activeDelivery?.customerLocation : undefined}
            route={pickedUp && activeDelivery?.customerLocation
              ? [activeRestaurant, activeDelivery.customerLocation]
              : undefined}
          />
        </div>
      )}
      {loadError && (
        <div className="courier-deliveries__error" role="alert">
          <span>{loadError}</span>
          <button type="button" disabled={loading} onClick={reload}>
            Try again
          </button>
        </div>
      )}
      {actionError && <p className="courier-deliveries__error" role="alert">{actionError}</p>}
      {loading && <p role="status">Loading assigned deliveries…</p>}
      {!loading && !loadError && deliveries.length === 0 && (
        <p className="courier-deliveries__empty">You have no offers or active deliveries right now.</p>
      )}
      <div className="courier-deliveries__list">
        {deliveries.map((delivery) => {
          const order = delivery.order;
          const isPending = pendingAction?.orderId === order.id;
          const isAssignedCourier = ownsDelivery(delivery, user);
          const isOffer = delivery.assignment.status === "Offered";
          const pickupEnabled = canConfirmPickup(delivery, user);
          const deliveryEnabled = canConfirmDelivery(delivery, user);

          return (
            <article className="courier-deliveries__card" key={order.id}>
              <div className="courier-deliveries__details">
                <h2>Order #{order.id}</h2>
                <p><strong>{order.restaurantName}</strong></p>
                <ul>
                  {order.lines.map((line) => (
                    <li key={line.menuItemId}>{line.quantity} × {line.name}</li>
                  ))}
                </ul>
                <p className="courier-deliveries__status" role="status">{statusLabels[order.status]}</p>
                <p>Assignment: {delivery.assignment.status}</p>
              </div>
              <div className="courier-deliveries__actions" aria-label={`Commands for order ${order.id}`}>
                {isOffer && (
                  <>
                    <button
                      type="button"
                      disabled={!isAssignedCourier || !canAcceptOffer(delivery, user) || pendingAction !== null}
                      onClick={() => void runAction(delivery, "accept")}
                    >
                      {isPending && pendingAction?.action === "accept" ? "Accepting…" : "Accept Offer"}
                    </button>
                    <button
                      type="button"
                      disabled={!isAssignedCourier || !canAcceptOffer(delivery, user) || pendingAction !== null}
                      onClick={() => void runAction(delivery, "decline")}
                    >
                      {isPending && pendingAction?.action === "decline" ? "Declining…" : "Decline Offer"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={!pickupEnabled || pendingAction !== null}
                  onClick={() => void runAction(delivery, "pickup")}
                >
                  {isPending && pendingAction?.action === "pickup" ? "Confirming Pickup…" : "Confirm Pickup"}
                </button>
                <button
                  type="button"
                  disabled={!deliveryEnabled || pendingAction !== null}
                  onClick={() => void runAction(delivery, "deliver")}
                >
                  {isPending && pendingAction?.action === "deliver" ? "Confirming Delivery…" : "Confirm Delivery"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
