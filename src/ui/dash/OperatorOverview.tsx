import type { OperatorRestaurant } from "../ord/OperatorRestaurantsPage";
import MapView, { type MapRestaurant } from "./MapView";
import "./operator-dashboard.css";

interface OperatorOverviewProps {
  restaurants: readonly OperatorRestaurant[];
  loading: boolean;
  error: string;
}

export default function OperatorOverview({ restaurants, loading, error }: OperatorOverviewProps) {
  const counts = {
    open: restaurants.filter((restaurant) => restaurant.status === "OPEN").length,
    paused: restaurants.filter((restaurant) => restaurant.status === "PAUSED").length,
  };
  const restaurantValue = (count: number) => loading ? "Loading…" : error ? "Unable to load" : count;
  // ORD endpoints do not authorize Operator-wide order reads. PRC summaries also
  // omit legacy deliveries without fare snapshots, so their count is not a full delivery total.
  // Keep order counts unavailable until a complete, authorized data source exists.
  const cards = [
    { label: "Total Orders", value: "N/A", note: "Platform-wide order totals are not available yet." },
    { label: "Active Orders", value: "N/A", note: "Platform-wide active-order counts are not available yet." },
    { label: "Delivered Orders", value: "N/A", note: "Complete delivery counts are not available yet. View summaries in Order History." },
    { label: "Open Restaurants", value: restaurantValue(counts.open), note: "Currently accepting orders." },
    { label: "Paused Restaurants", value: restaurantValue(counts.paused), note: "Ordering is temporarily paused." },
    { label: "Available Couriers", value: "N/A", note: "Not available yet." },
  ];


  // Preserve the existing restaurant markers; queue and courier data are not connected yet.
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
      <h1>Overview</h1>
      {loading && <p role="status">Loading restaurants...</p>}
      {error && <p role="alert">{error}</p>}
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
      <h2>City map</h2>
      {!loading && !error && (
          <div className="operator-overview__map">
            <MapView restaurants={mapRestaurants} couriers={[]} showLabels />
          </div>
      )}
    </section>
  );
}
