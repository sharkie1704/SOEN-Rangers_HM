import { useEffect, useState } from "react";
import type { OrderDTO } from "../../application/ord/OrderDTO.ts";
import { api, ApiError } from "../reg/api/client";
import type { OperatorRestaurant } from "../ord/OperatorRestaurantsPage";
import MapView, { type MapRestaurant } from "./MapView";
import "./operator-dashboard.css";

interface OperatorOverviewProps {
  restaurants: readonly OperatorRestaurant[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onNavigate: (section: "restaurants" | "orders") => void;
}

export default function OperatorOverview({ restaurants, loading, error, onRefresh, onNavigate }: OperatorOverviewProps) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Pick<OrderDTO, "status">[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  const [queueSnapshot, setQueueSnapshot] = useState<{
    restaurants: readonly OperatorRestaurant[];
    counts: Map<string, number>;
    failed: string[];
  } | null>(null);
  const [dispatchQueue, setDispatchQueue] = useState<{ count: number | null; error: string }>({ count: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    setQueueSnapshot(null);
    if (loading || error) return () => { cancelled = true; };

    const mapped = restaurants.filter((restaurant) =>
      restaurant.lat !== null && restaurant.lng !== null
      && Number.isFinite(restaurant.lat) && Number.isFinite(restaurant.lng)
      && Math.abs(restaurant.lat) <= 90 && Math.abs(restaurant.lng) <= 180);

    void Promise.all(mapped.map(async (restaurant) => {
      try {
        const { queuedCount } = await api<{ queuedCount: number }>(
          `/api/restaurants/${encodeURIComponent(restaurant.id)}/orders/queue-count`,
        );
        if (!Number.isSafeInteger(queuedCount) || queuedCount < 0) throw new Error("Invalid queue count");
        return { id: restaurant.id, count: queuedCount };
      } catch {
        return { id: restaurant.id, count: null };
      }
    })).then((results) => {
      if (cancelled) return;
      const counts = new Map<string, number>();
      const failed: string[] = [];
      for (const { id, count } of results) {
        if (count === null) failed.push(id);
        else counts.set(id, count);
      }
      setQueueSnapshot({ restaurants, counts, failed });
    });
    return () => { cancelled = true; };
  }, [restaurants, loading, error]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const response = await api<{ orders: Pick<OrderDTO, "status">[] }>("/api/orders/all");
        if (!cancelled) setOrders(response.orders);
      } catch (e) {
        if (!cancelled) {
          setOrdersError(e instanceof ApiError
            ? `Could not load order statistics: ${e.message}`
            : "Could not load order statistics. Please try reopening Overview.");
        }
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    }

    loadOrders();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDispatchQueue() {
      try {
        const response = await api<unknown>("/api/dispatch/queue");
        if (typeof response !== "object" || response === null
          || !("waiting" in response) || !Array.isArray(response.waiting)) {
          throw new Error("Invalid dispatch queue response.");
        }
        if (!cancelled) setDispatchQueue({ count: response.waiting.length, error: "" });
      } catch (e) {
        if (!cancelled) {
          setDispatchQueue({ count: null, error: e instanceof ApiError
            ? `Could not load orders waiting for courier: ${e.message}`
            : "Could not load orders waiting for courier. Please try reopening Overview." });
        }
      }
    }

    void loadDispatchQueue();
    return () => { cancelled = true; };
  }, []);

  // All three order counts use the same authorized platform-wide response.
  const orderCounts = {
    total: orders.length,
    active: orders.filter((order) => ["Placed", "Accepted", "Preparing", "Ready", "PickedUp"].includes(order.status)).length,
    delivered: orders.filter((order) => order.status === "Delivered").length,
  };
  const orderValue = (count: number) => ordersLoading ? "Loading…" : ordersError ? "Unable to load" : count;
  const counts = {
    open: restaurants.filter((restaurant) => restaurant.status === "OPEN").length,
    paused: restaurants.filter((restaurant) => restaurant.status === "PAUSED").length,
  };
  const restaurantValue = (count: number) => loading ? "Loading…" : error ? "Unable to load" : count;
  const cards = [
    { label: "Total Orders", value: orderValue(orderCounts.total), note: "All platform orders, including delivered, cancelled and rejected orders." },
    { label: "Active Orders", value: orderValue(orderCounts.active), note: "Orders placed, accepted, preparing, ready or picked up." },
    { label: "Delivered Orders", value: orderValue(orderCounts.delivered), note: "All orders with Delivered status." },
    { label: "Open Restaurants", value: restaurantValue(counts.open), note: "Currently accepting orders." },
    { label: "Paused Restaurants", value: restaurantValue(counts.paused), note: "Ordering is temporarily paused." },
    { label: "Orders Waiting for Courier", value: dispatchQueue.error ? "Unable to load" : dispatchQueue.count ?? "Loading…", note: "READY orders waiting for an available courier." },
  ];

  const currentQueues = queueSnapshot?.restaurants === restaurants ? queueSnapshot : null;
  const mappedRestaurants = restaurants.filter((restaurant) =>
    restaurant.lat !== null && restaurant.lng !== null
    && Number.isFinite(restaurant.lat) && Number.isFinite(restaurant.lng)
    && Math.abs(restaurant.lat) <= 90 && Math.abs(restaurant.lng) <= 180);
  const mapRestaurants: MapRestaurant[] = mappedRestaurants.map((restaurant) => {
    const count = currentQueues?.counts.get(restaurant.id);
    return {
      id: restaurant.id,
      name: restaurant.name,
      lat: restaurant.lat!,
      lng: restaurant.lng!,
      status: restaurant.status,
      queue: count === undefined
        ? { availability: currentQueues ? "unavailable" : "loading" }
        : { length: count },
    };
  });

  return (
    <section className="operator-overview" aria-label="Operator overview">
      <header className="operator-overview__header">
        <div>
          <p className="operator-overview__eyebrow">PLATFORM AT A GLANCE</p>
          <h1>Overview</h1>
          <p>Monitor restaurant operations and jump straight into the work that needs attention.</p>
        </div>
        <div className="operator-overview__actions">
          <button type="button" onClick={() => onNavigate("orders")}>View orders</button>
          <button type="button" onClick={() => onNavigate("restaurants")}>Manage restaurants</button>
        </div>
      </header>
      {loading && <p role="status">Loading restaurants...</p>}
      {error && (
        <div className="operator-overview__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRefresh}>Try again</button>
        </div>
      )}
      {ordersError && <p role="alert">{ordersError}</p>}
      {dispatchQueue.error && <p role="alert">{dispatchQueue.error}</p>}
      <dl className="operator-overview__cards" aria-label="Platform summary">
        {cards.map(({ label, value, note }) => (
          <div className="operator-overview__card" key={label}>
            <dt>{label}</dt>
            <dd>
              <span className={typeof value === "number" ? "operator-overview__value" : "operator-overview__value operator-overview__value--text"}>
                {value}
              </span>
              <span className="operator-overview__note">{note}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="operator-overview__section-heading">
        <div>
          <h2>Restaurant locations</h2>
          <p>Select a marker to explore the restaurant's location.</p>
        </div>
        <span>{loading || (!error && mappedRestaurants.length > 0 && !currentQueues) ? "Loading locations…" : `${mapRestaurants.length} mapped`}</span>
      </div>
      {!loading && !error && mappedRestaurants.length > 0 && !currentQueues && (
        <p role="status">Loading preparation queue counts…</p>
      )}
      {!loading && !error && currentQueues && currentQueues.failed.length > 0 && (
        <p role="alert">Could not load preparation queue counts for {currentQueues.failed.length} restaurant(s). Their queue counts are unavailable.</p>
      )}
      {!loading && !error && (
        mappedRestaurants.length > 0 ? (
          <div className="operator-overview__map">
            <MapView
              restaurants={mapRestaurants}
              couriers={[]}
              showLabels
              selectedRestaurantId={selectedRestaurantId}
              onSelectRestaurant={setSelectedRestaurantId}
            />
          </div>
        ) : (
          <div className="operator-overview__empty">
            <strong>No mapped restaurant locations yet</strong>
            <p>Locations will appear here when restaurants have coordinates.</p>
          </div>
        )
      )}
    </section>
  );
}
