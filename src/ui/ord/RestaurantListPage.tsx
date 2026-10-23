
import { useEffect, useState } from "react";
import RestaurantCard from "./RestaurantCard";
import { getRestaurantDemoDetails } from "./restaurantDemoDetails";
import { api } from "../reg/api/client";

type RestaurantListPageInputs = {
  onSelectRestaurant: (restaurantId: string) => void;
};

type Restaurant = {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  status: "OPEN" | "PAUSED" | "CLOSED";
};

export default function RestaurantListPage({
  onSelectRestaurant,}: RestaurantListPageInputs) {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
  let cancelled = false;

  async function loadRestaurants() {
    try {
      const data = await api<{ restaurants: Restaurant[] }>("/api/restaurants");

      if (!cancelled) {
        setRestaurants(data.restaurants);
      }
    } catch {
      if (!cancelled) {
        setError("Could not load restaurants. Please try again.");
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  loadRestaurants();

  return () => {
    cancelled = true;
  };
}, []);
  return (
    <main
      style={{
        backgroundColor: "#FFF9F2",
        minHeight: "100vh",
        padding: "40px",
        boxSizing: "border-box",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <h1 style={{ color: "#4B3028", textAlign: "center", fontSize: "32px", lineHeight: 1.2, margin: "52px 0 16px" }}>
         Discover the best sweet treats in Montréal
      </h1>

      <p style={{ color: "#4B3028", textAlign: "center"  }}>
         Craving something sweet? Discover local dessert spots and find your next favourite treat
      </p>

      <section
        aria-label="Restaurants"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(min(100%, 250px), 1fr))",
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
          gap: "24px",
          marginTop: "48px",
        }}
      >
        {loading && <p>Loading restaurants...</p>}

         {error && <p role="alert">{error}</p>}

      {!loading && !error && restaurants.length === 0 && (
      <p>No restaurants available yet.</p>
)}
        {restaurants.map((restaurant) => {
          const details = getRestaurantDemoDetails(restaurant.id);
          return (
            <RestaurantCard
              key={restaurant.id}
              name={restaurant.name}
              category={restaurant.category}
              address={details?.address ?? "Montreal address coming soon"}
              specialty={details?.specialty ?? restaurant.description}
              rating={details?.rating}
              status={restaurant.status.toLowerCase() as "open" | "paused" | "closed"}
              image={restaurant.imageUrl}
              onViewMenu={() => onSelectRestaurant(restaurant.id)}
            />
          );
        })}
      </section>
    </main>
  );
}
