import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import MapView, { type MapRestaurant } from "../dash/MapView";
import RestaurantDetails from "../dash/map-popup/RestaurantDetails";
import { buildRoleMapView } from "../dash/roles";
import type { PanelOrder } from "../dash/map-popup/PopupInfoTypes";
import { page, row, primary, secondary, statusLabel, type RestaurantStatus } from "./MenuEditorPage";
import "./button-interactions.css";

type OperatorRestaurant = {
  id: string;
  name: string;
  status: RestaurantStatus;
  lat: number | null;
  lng: number | null;
  queueLength?: number;
};

export default function OperatorRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<OperatorRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ordersByRestaurant, setOrdersByRestaurant] = useState<Record<string, PanelOrder[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadRestaurants() {
      try {
        const res = await api<{ restaurants: OperatorRestaurant[] }>("/api/restaurants");
        const withOrders = await Promise.all(res.restaurants.map(async (restaurant) => {
          const response = await api<{ orders: { id: number; status: string }[] }>(
            `/api/restaurants/${encodeURIComponent(restaurant.id)}/orders/all`,
          );
          return { restaurant, orders: response.orders };
        }));
        if (!cancelled) {
          setRestaurants(withOrders.map(({ restaurant, orders }) => ({
            ...restaurant,
            queueLength: orders.filter((order) => order.status === "Accepted" || order.status === "Preparing").length,
          })));
          setOrdersByRestaurant(Object.fromEntries(withOrders.map(({ restaurant, orders }) => [
            restaurant.id,
            orders.map((order) => ({ id: String(order.id), state: order.status })),
          ])));
        }
      } catch {
        if (!cancelled) {
          setError("Could not load restaurants. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRestaurants();
    const timer = setInterval(loadRestaurants, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  async function changeStatus(restaurant: OperatorRestaurant, status: "PAUSED" | "OPEN") {
    try {
      const res = await api<{ restaurant: { id: string; status: RestaurantStatus }; eventId: number }>(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/status`,
        { method: "PATCH", body: { status } },
      );
      setRestaurants((current) =>
        current.map((r) => (r.id === res.restaurant.id ? { ...r, status: res.restaurant.status } : r)),
      );
      const text = `${restaurant.name} ${status === "PAUSED" ? "paused" : "reopened"} (event #${res.eventId})`;
      setMessage(text);
    } catch (e) {
      const text = e instanceof ApiError ? `Error: ${e.message}` : "Error: request failed";
      setMessage(text);
    }
  }

  const mapRestaurants: MapRestaurant[] = restaurants.flatMap((restaurant) => (
    restaurant.lat === null || restaurant.lng === null ? [] : [{
      id: restaurant.id,
      name: restaurant.name,
      lat: restaurant.lat,
      lng: restaurant.lng,
      status: restaurant.status,
      queue: { length: restaurant.queueLength ?? 0 },
    }]
  ));

  const mapView = buildRoleMapView("OPERATOR")({
    user: { id: "operator", name: "Operator", role: "OPERATOR" },
    restaurants: mapRestaurants,
    couriers: [],
  });

  return (
    <section style={page}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "28px", margin: "0 0 16px" }}>Restaurants</h2>

        {loading && <p>Loading restaurants...</p>}
        {error && <p className="error">{error}</p>}
        {message && <p role="status" style={{ fontWeight: 600 }}>{message}</p>}
        {!loading && !error && restaurants.length === 0 && <p>No restaurants yet.</p>}

        {!loading && !error && (
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
              renderDetails={(mapRestaurant) => {
                const full = restaurants.find((r) => r.id === mapRestaurant.id);
                if (!full) return null;
                return (
                  <RestaurantDetails
                    restaurant={mapRestaurant}
                    view={mapView}
                    onViewMenu={() => undefined}
                    orders={ordersByRestaurant[mapRestaurant.id] ?? []}
                  />
                );
              }}
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
                  <button className="interactive-button" style={primary} onClick={() => changeStatus(restaurant, "PAUSED")}>
                    Pause
                  </button>
                )}
                {restaurant.status === "PAUSED" && (
                  <button className="interactive-button" style={secondary} onClick={() => changeStatus(restaurant, "OPEN")}>
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