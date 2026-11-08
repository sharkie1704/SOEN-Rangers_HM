import { useEffect, useState } from "react";
import { api } from "../reg/api/client";
import MapView, { type MapRestaurant } from "./MapView";
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

  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      try {
        const { restaurants: summaries } = await api<{ restaurants: RestaurantSummary[] }>("/api/restaurants");
        const queueCounts = new Map<string, number>();

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
          setError("");
        }
      } catch {
        if (!cancelled) setError("Could not load the restaurant map.");
      }
    }

    loadMap();
    // this allows the map to refresh every 5 seconds for customers 
    const timer = user.role === "CUSTOMER" || user.role === "RESTAURANT" || user.role === "OPERATOR"
      ? setInterval(loadMap, 5000)
      : undefined;
    return () => {
      cancelled = true;
      if (timer !== undefined) clearInterval(timer);
    };
  }, [user.role, user.restaurantId]);

  const view = buildRoleMapView(user.role)({ user, restaurants, couriers: [] });
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
