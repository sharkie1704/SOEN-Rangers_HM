import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import { page, row, primary, secondary, statusLabel, type RestaurantStatus } from "./MenuEditorPage";
import "./button-interactions.css";

type OperatorRestaurant = {
  id: string;
  name: string;
  status: RestaurantStatus;
};

export default function OperatorRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<OperatorRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRestaurants() {
      try {
        const res = await api<{ restaurants: OperatorRestaurant[] }>("/api/restaurants");
        if (!cancelled) setRestaurants(res.restaurants);
      } catch {
        if (!cancelled) setError("Could not load restaurants. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRestaurants();
    return () => { cancelled = true; };
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
      setMessage(`${restaurant.name} ${status === "PAUSED" ? "paused" : "reopened"} (event #${res.eventId})`);
    } catch (e) {
      setMessage(e instanceof ApiError ? `Error: ${e.message}` : "Error: request failed");
    }
  }

  return (
    <section style={page}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "28px", margin: "0 0 16px" }}>Restaurants</h2>

        {loading && <p>Loading restaurants...</p>}
        {error && <p className="error">{error}</p>}
        {message && <p role="status" style={{ fontWeight: 600 }}>{message}</p>}
        {!loading && !error && restaurants.length === 0 && <p>No restaurants yet.</p>}

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
