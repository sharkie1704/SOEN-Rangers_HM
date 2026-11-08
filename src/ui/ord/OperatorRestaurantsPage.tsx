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

export default function OperatorRestaurantsPage({
  restaurants, loading, error, message, onChangeStatus,
}: OperatorRestaurantsPageProps) {
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

  return (
    <section style={page}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "28px", margin: "0 0 16px" }}>Restaurants</h2>

        {loading && <p>Loading restaurants...</p>}
        {error && <p className="error">{error}</p>}
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

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" }}>
          {restaurants.map((restaurant) => (
            <li key={restaurant.id} style={row}>
              <strong>{restaurant.name}</strong>
              <span>{statusLabel(restaurant.status)}</span>
              <span style={{ marginLeft: "auto" }}>
                {restaurant.status === "OPEN" && (
                  <button className="interactive-button" style={primary} onClick={() => onChangeStatus(restaurant, "PAUSED")}>
                    Pause
                  </button>
                )}
                {restaurant.status === "PAUSED" && (
                  <button className="interactive-button" style={secondary} onClick={() => onChangeStatus(restaurant, "OPEN")}>
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
