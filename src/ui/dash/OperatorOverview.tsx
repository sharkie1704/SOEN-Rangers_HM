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
    { label: "Available Couriers", value: "N/A", note: "Not available yet." },
  ];

  const mapRestaurants: MapRestaurant[] = restaurants.flatMap((restaurant) => (
    restaurant.lat === null || restaurant.lng === null ? [] : [{
      id: restaurant.id,
      name: restaurant.name,
      lat: restaurant.lat,
      lng: restaurant.lng,
      status: restaurant.status,
      queue: { length: 0 },
    }]
  ));

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
        <span>{loading ? "Loading locations…" : `${mapRestaurants.length} mapped`}</span>
      </div>
      {!loading && !error && (
        mapRestaurants.length > 0 ? (
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
