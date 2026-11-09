import { useState } from "react";
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
  const counts = {
    total: restaurants.length,
    open: restaurants.filter((restaurant) => restaurant.status === "OPEN").length,
    paused: restaurants.filter((restaurant) => restaurant.status === "PAUSED").length,
    closed: restaurants.filter((restaurant) => restaurant.status === "CLOSED").length,
  };
  const restaurantValue = (count: number) => loading ? "Loading…" : error ? "Unable to load" : count;
  const cards = [
    { label: "Total restaurants", value: restaurantValue(counts.total), note: "Restaurants on the platform." },
    { label: "Open", value: restaurantValue(counts.open), note: "Currently accepting orders." },
    { label: "Paused", value: restaurantValue(counts.paused), note: "Temporarily not accepting orders." },
    { label: "Closed", value: restaurantValue(counts.closed), note: "Currently closed." },
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
      <dl className="operator-overview__cards" aria-label="Restaurant status summary">
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
