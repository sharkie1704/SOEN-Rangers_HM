import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import MapView, { type MapRestaurant } from "../dash/MapView";
import RestaurantDetails from "../dash/map-popup/RestaurantDetails";
import type { PanelOrder } from "../dash/map-popup/PopupInfoTypes";
import { buildRoleMapView } from "../dash/roles";
import { statusLabel, type RestaurantStatus } from "./MenuEditorPage";
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
  onRefresh: () => void;
}

type RestaurantOrder = PanelOrder;
type OrdersByRestaurant = Record<string, RestaurantOrder[]>;

export default function OperatorRestaurantsPage({
  restaurants, loading, error, message, onChangeStatus, onRefresh,
}: OperatorRestaurantsPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ordersByRestaurant, setOrdersByRestaurant] = useState<OrdersByRestaurant>({});
  const [ordersError, setOrdersError] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RestaurantStatus | "ALL">("ALL");
  const [pendingRestaurantId, setPendingRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOrdersLoading(restaurants.length > 0);

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
      } finally {
        if (!cancelled) setOrdersLoading(false);
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
  const restaurantValue = (count: number) => loading ? "Loading..." : error ? "Unable to load" : count;
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
  const filteredRestaurants = restaurants.filter((restaurant) => (
    (statusFilter === "ALL" || restaurant.status === statusFilter)
    && restaurant.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ));

  return (
    <section className="operator-restaurants" aria-label="Restaurant management">
      <header className="operator-restaurants__header">
        <div>
          <p className="operator-restaurants__eyebrow">PLATFORM MANAGEMENT</p>
          <h1>Restaurants</h1>
          <p>Review restaurant activity and pause or reopen ordering when needed.</p>
        </div>
        <div className="operator-restaurants__header-actions">
          <span className="operator-restaurants__total">{restaurantValue(counts.total)} restaurants</span>
          <button type="button" className="operator-restaurants__refresh" onClick={onRefresh} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </header>

      {loading && <p role="status">Loading restaurants...</p>}
      {error && (
        <div className="operator-restaurants__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRefresh} disabled={loading}>Try again</button>
        </div>
      )}
      {message && (
        message.startsWith("Error:")
          ? <p className="operator-restaurants__error" role="alert">{message}</p>
          : <p className="operator-restaurants__message" role="status">{message}</p>
      )}
      {!loading && !error && restaurants.length === 0 && (
        <div className="operator-restaurants__empty">
          <strong>No restaurants yet</strong>
          <p>Restaurants will appear here when added to the platform.</p>
        </div>
      )}

      <section className="operator-restaurants__summary" aria-label="Restaurant status summary">
        <h2>Restaurant status</h2>
        <dl className="operator-restaurants__statuses">
          {restaurantStatuses.map(({ label, count }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{restaurantValue(count)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {ordersError && <p className="operator-restaurants__error" role="alert">Order details for map markers: {ordersError}</p>}
      {!loading && !error && restaurants.length > 0 && (
        <section className="operator-restaurants__map-section" aria-label="Restaurant map">
          <div className="operator-restaurants__section-heading">
            <div>
              <h2>Restaurant map</h2>
              <p>Select a marker to review its location, status, and order queue.</p>
            </div>
            <span>{mapRestaurants.length} mapped</span>
          </div>
          {ordersLoading && <p role="status">Loading restaurant order activity...</p>}
          {mapRestaurants.length > 0 ? (
            <div className="operator-restaurants__map">
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
          ) : (
            <div className="operator-restaurants__empty">
              <strong>No restaurant locations to map</strong>
              <p>Restaurant records without coordinates remain available in the directory below.</p>
            </div>
          )}
        </section>
      )}

      <section className="operator-restaurants__directory" aria-label="Restaurant directory">
        <div className="operator-restaurants__section-heading">
          <div>
            <h2>Restaurant directory</h2>
            <p>Find a restaurant and manage its ordering availability.</p>
          </div>
        </div>
        <div className="operator-restaurants__filters">
          <label>
            <span>Search restaurants</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Restaurant name"
            />
          </label>
          <label>
            <span>Restaurant status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as RestaurantStatus | "ALL")}>
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="PAUSED">Paused</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
        </div>
        {!loading && !error && filteredRestaurants.length === 0 && restaurants.length > 0 && (
          <p className="operator-restaurants__empty">No restaurants match these filters.</p>
        )}
        <ul className="operator-restaurants__list">
          {filteredRestaurants.map((restaurant) => (
            <li key={restaurant.id} className="operator-restaurants__card">
              <div className="operator-restaurants__card-main">
                <h3>{restaurant.name}</h3>
                <span className={`operator-restaurants__status operator-restaurants__status--${restaurant.status.toLowerCase()}`}>
                  {statusLabel(restaurant.status)}
                </span>
                <p>
                  {ordersLoading
                    ? "Loading order activity..."
                    : ordersError
                      ? "Order activity unavailable"
                      : `${ordersByRestaurant[restaurant.id]?.length ?? 0} orders recorded`}
                </p>
              </div>
              <div className="operator-restaurants__card-action">
                {restaurant.status === "OPEN" && (
                  <button
                    type="button"
                    className="operator-restaurants__pause"
                    disabled={pendingRestaurantId === restaurant.id}
                    onClick={async () => {
                      setPendingRestaurantId(restaurant.id);
                      try {
                        await onChangeStatus(restaurant, "PAUSED");
                      } finally {
                        setPendingRestaurantId(null);
                      }
                    }}
                  >
                    {pendingRestaurantId === restaurant.id ? "Pausing..." : "Pause ordering"}
                  </button>
                )}
                {restaurant.status === "PAUSED" && (
                  <button
                    type="button"
                    className="operator-restaurants__reopen"
                    disabled={pendingRestaurantId === restaurant.id}
                    onClick={async () => {
                      setPendingRestaurantId(restaurant.id);
                      try {
                        await onChangeStatus(restaurant, "OPEN");
                      } finally {
                        setPendingRestaurantId(null);
                      }
                    }}
                  >
                    {pendingRestaurantId === restaurant.id ? "Reopening..." : "Reopen ordering"}
                  </button>
                )}
                {restaurant.status === "CLOSED" && <span className="operator-restaurants__closed-note">No status action available</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
