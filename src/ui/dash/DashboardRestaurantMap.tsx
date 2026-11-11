import { useEffect, useState } from "react";
import { api } from "../reg/api/client";
import MapView, { type MapCourier, type MapRestaurant } from "./MapView";
import RestaurantDetails from "./map-popup/RestaurantDetails";
import { buildRoleMapView, type SessionUser } from "./roles";
import type { PanelOrder } from "./map-popup/PopupInfoTypes";

interface Props {
  user: SessionUser;
  onViewMenu?: (restaurantId: string) => void;
}

type RestaurantSummary = {
  id: string;
  name: string;
  status: MapRestaurant["status"];
  lat: number | null;
  lng: number | null;
};

export default function DashboardRestaurantMap({ user, onViewMenu }: Props) {
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [couriers, setCouriers] = useState<MapCourier[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      try {
        const { restaurants: summaries } = await api<{ restaurants: RestaurantSummary[] }>("/api/restaurants");
        const queueCounts = new Map<string, number>();
        let mapCouriers: MapCourier[] = [];

        if (user.role === "COURIER") {
          const response = await api<{ courier: { status: MapCourier["status"]; location?: { lat: number; lng: number } } }>("/api/couriers/me/availability");
          if (response.courier.location) {
            mapCouriers = [{ id: user.id, name: user.name, status: response.courier.status, ...response.courier.location }];
          }
        } else if (user.role === "RESTAURANT" && user.restaurantId) {
          const response = await api<{ couriers: MapCourier[] }>(
            `/api/restaurants/${encodeURIComponent(user.restaurantId)}/couriers/on-duty`,
          );
          mapCouriers = response.couriers;
        }

        if (user.role !== "COURIER") {
          const queueResults = await Promise.all(summaries.map(async (restaurant) => {
            const response = await api<{ queuedCount: number }>(
              `/api/restaurants/${encodeURIComponent(restaurant.id)}/orders/queue-count`,
            );
            return [restaurant.id, response.queuedCount] as const;
          }));
          for (const [restaurantId, count] of queueResults) queueCounts.set(restaurantId, count);
        }

        const visibleSummaries = user.role === "RESTAURANT" && user.restaurantId
          ? summaries.filter((restaurant) => restaurant.id === user.restaurantId)
          : summaries;

        const mapRestaurants = visibleSummaries.flatMap((restaurant) => (
          restaurant.lat === null || restaurant.lng === null ? [] : [{
            id: restaurant.id,
            name: restaurant.name,
            status: restaurant.status,
            lat: restaurant.lat,
            lng: restaurant.lng,
            queue: { length: queueCounts.get(restaurant.id) ?? 0 },
          }]
        ));

        if (!cancelled) {
          setRestaurants(mapRestaurants);
          setCouriers(mapCouriers);
          setError("");
        }
      } catch {
        if (!cancelled) setError("Could not load the restaurant map.");
      }
    }

    loadMap();
    const events = user.role === "CUSTOMER" || user.role === "RESTAURANT" || user.role === "OPERATOR"
      ? new EventSource("/api/command-events")
      : undefined;
    events?.addEventListener("command", loadMap);
    return () => {
      cancelled = true;
      events?.close();
    };
  }, [user.id, user.name, user.role, user.restaurantId]);

  const view = buildRoleMapView(user.role)({ user, restaurants, couriers });
  const selectedOrders: PanelOrder[] = [];

  return (
    <section aria-label="Restaurant map" style={{ width: "min(100% - 32px, 1200px)", margin: "24px auto" }}>
      {error && <p className="error" role="alert">{error}</p>}
      <div style={{ height: "420px", border: "1px solid #EADBC8", borderRadius: "12px", overflow: "hidden" }}>
        <MapView
          restaurants={view.restaurants}
          couriers={view.couriers}
          showLabels
          selectedRestaurantId={selectedId}
          onSelectRestaurant={setSelectedId}
          highlightedRestaurantId={view.highlightedRestaurantId}
          highlightedCourierId={view.highlightedCourierId}
          deliveryPin={view.deliveryPin}
          route={view.route}
          renderDetails={(restaurant) => (
            <RestaurantDetails
              restaurant={restaurant}
              view={view}
              onViewMenu={() => onViewMenu?.(restaurant.id)}
              orders={selectedOrders}
            />
          )}
        />
      </div>
    </section>
  );
}
