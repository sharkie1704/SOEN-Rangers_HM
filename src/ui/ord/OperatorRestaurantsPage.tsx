import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import MapView, { type MapRestaurant } from "../dash/MapView";
import RestaurantDetails from "../dash/map-popup/RestaurantDetails";
import type { PanelOrder } from "../dash/map-popup/PopupInfoTypes";
import { buildRoleMapView } from "../dash/roles";
import { page, row, primary, secondary, statusLabel, type RestaurantStatus } from "./MenuEditorPage";
import "./button-interactions.css";
import "../dash/operator-dashboard.css";

export type OperatorRestaurant = {
  id: string;
  name: string;
  status: RestaurantStatus;
  lat: number | null;
  lng: number | null;
};

interface OperatorRestaurantsPageProps {
  restaurants: readonly OperatorRestaurant[];
  loading: boolean;
  error: string;
  message: string;
  onChangeStatus: (restaurant: OperatorRestaurant, status: "PAUSED" | "OPEN") => Promise<void>;
}

type RestaurantOrder = PanelOrder;
type OrdersByRestaurant = Record<string, RestaurantOrder[]>;

export default function OperatorRestaurantsPage({
  restaurants, loading, error, message, onChangeStatus,
}: OperatorRestaurantsPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ordersByRestaurant, setOrdersByRestaurant] = useState<OrdersByRestaurant>({});
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const results = await Promise.all(restaurants.map(async (restaurant) => {
          const response = await api<{ orders: { id: number; status: string }[] }>(
            `/api/restaurants/${encodeURIComponent(restaurant.id)}/orders/all`,
          );
          return [restaurant.id, response.orders.map((order) => ({
            id: String(order.id),
            state: order.status,
          }))] as const;
        }));
        if (!cancelled) {
          setOrdersByRestaurant(Object.fromEntries(results));
          setOrdersError("");
        }
      } catch (cause) {
        if (!cancelled) {
          setOrdersError(cause instanceof ApiError ? cause.message : "Could not load restaurant orders for the map.");
        }
      }
    }

    if (restaurants.length > 0) {
      void loadOrders();
      const events = new EventSource("/api/command-events");
      events.addEventListener("command", loadOrders);
      return () => {
        cancelled = true;
        events.close();
      };
    }

    setOrdersByRestaurant({});
    setOrdersError("");
    return () => { cancelled = true; };
  }, [restaurants]);

  const counts = {
    total: restaurants.length,
    open: restaurants.filter((restaurant) => restaurant.status === "OPEN").length,
    paused: restaurants.filter((restaurant) => restaurant.status === "PAUSED").length,
    closed: restaurants.filter((restaurant) => restaurant.status === "CLOSED").length,
  };
  const restaurantValue = (count: number) => loading ? "Loading…" : error ? "Unable to load" : count;
  const restaurantStatuses = [
    { label: "Total restaurants", count: counts.total },
    { label: "Open restaurants", count: counts.open },
    { label: "Paused restaurants", count: counts.paused },
    { label: "Closed restaurants", count: counts.closed },
  ];

  const mapRestaurants: MapRestaurant[] = restaurants.flatMap((restaurant) => {
    if (restaurant.lat === null || restaurant.lng === null) return [];
    const orders = ordersByRestaurant[restaurant.id] ?? [];
    const queueLength = orders.filter((order) => order.state === "Accepted" || order.state === "Preparing").length;
    return [{
      id: restaurant.id,
      name: restaurant.name,
      lat: restaurant.lat,
      lng: restaurant.lng,
      status: restaurant.status,
      queue: { length: queueLength },
    }];
  });
  const mapView = buildRoleMapView("OPERATOR")({
    user: { id: "operator", name: "Operator", role: "OPERATOR" },
    restaurants: mapRestaurants,
    couriers: [],
  });

  return (
    <section style={page}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "28px", margin: "0 0 16px" }}>Restaurants</h2>

        {loading && <p>Loading restaurants...</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {message && <p role="status" style={{ fontWeight: 600 }}>{message}</p>}
        {!loading && !error && restaurants.length === 0 && <p>No restaurants yet.</p>}

        <section className="operator-restaurants__summary" aria-label="Restaurant status summary">
          <h3>Restaurant status</h3>
          <dl className="operator-restaurants__statuses">
            {restaurantStatuses.map(({ label, count }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{restaurantValue(count)}</dd>
              </div>
            ))}
          </dl>
        </section>

        {ordersError && <p className="error" role="alert">Map order details: {ordersError}</p>}
        {!loading && !error && restaurants.length > 0 && (
          <div style={{ height: "420px", marginBottom: "24px", border: "1px solid #EADBC8", borderRadius: "12px", overflow: "hidden", position: "relative" }}>
            <MapView
              restaurants={mapRestaurants}
              couriers={mapView.couriers}
              showLabels
              selectedRestaurantId={selectedId}
              onSelectRestaurant={setSelectedId}
              highlightedRestaurantId={mapView.highlightedRestaurantId}
              highlightedCourierId={mapView.highlightedCourierId}
              deliveryPin={mapView.deliveryPin}
              renderDetails={(restaurant) => (
                <RestaurantDetails
                  restaurant={restaurant}
                  view={mapView}
                  onViewMenu={() => undefined}
                  orders={ordersByRestaurant[restaurant.id] ?? []}
                />
              )}
            />
          </div>
        )}

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" }}>
          {restaurants.map((restaurant) => (
            <li key={restaurant.id} style={row}>
              <strong>{restaurant.name}</strong>
              <span>{statusLabel(restaurant.status)}</span>
              <span style={{ marginLeft: "auto" }}>
                {restaurant.status === "OPEN" && (
                  <button className="interactive-button" style={primary} onClick={() => void onChangeStatus(restaurant, "PAUSED")}>
                    Pause
                  </button>
                )}
                {restaurant.status === "PAUSED" && (
                  <button className="interactive-button" style={secondary} onClick={() => void onChangeStatus(restaurant, "OPEN")}>
                    Reopen
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
