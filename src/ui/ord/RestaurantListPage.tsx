import { useMemo, useState } from "react";
import RestaurantCard from "./RestaurantCard";
import { getRestaurantDemoDetails } from "./restaurantDemoDetails";
import { api } from "../reg/api/client";
import { useApi } from "../reg/api/useApi";
import "./restaurant-list.css";

type RestaurantListPageInputs = { onSelectRestaurant: (restaurantId: string) => void };
type Restaurant = {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  status: "OPEN" | "PAUSED" | "CLOSED";
  averageRating?: number | null;
  ratingCount?: number;
};

export default function RestaurantListPage({ onSelectRestaurant }: RestaurantListPageInputs) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All desserts");
  const { data, loading, error } = useApi(
    () => api<{ restaurants: Restaurant[] }>("/api/restaurants"),
    "Could not load restaurants. Please try again.",
  );
  const restaurants = data?.restaurants ?? [];
  const categories = ["All desserts", ...new Set(restaurants.map((restaurant) => restaurant.category))];
  const filtered = useMemo(() => restaurants.filter((restaurant) => {
    const matchesCategory = category === "All desserts" || restaurant.category === category;
    const haystack = `${restaurant.name} ${restaurant.category} ${restaurant.description}`.toLowerCase();
    return matchesCategory && haystack.includes(query.trim().toLowerCase());
  }), [restaurants, category, query]);

  return (
    <main className="restaurant-discovery">
      <section className="restaurant-discovery__intro" aria-labelledby="discover-title">
        <p className="restaurant-discovery__eyebrow">YOUR NEXT FAVOURITE TREAT</p>
        <h1 id="discover-title">Discover dessert spots</h1>
        <p>Find something delicious from Montréal's neighbourhood bakeries, cafés, and sweet shops.</p>
      </section>
      <section className="restaurant-discovery__catalog" aria-label="Restaurants">
        <div className="restaurant-discovery__tools">
          <label className="restaurant-discovery__search">
            <span>Search restaurants</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try cheesecake or bakery" />
          </label>
          <label className="restaurant-discovery__category">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <p className="restaurant-discovery__count">{filtered.length} {filtered.length === 1 ? "spot" : "spots"}</p>
        </div>
        {loading && <p role="status">Loading dessert spots…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && filtered.length === 0 && <p className="restaurant-discovery__empty">No dessert spots match that search. Try another name or category.</p>}
        <div className="restaurant-discovery__grid">
          {filtered.map((restaurant) => {
            const details = getRestaurantDemoDetails(restaurant.id);
            return <RestaurantCard
              key={restaurant.id}
              name={restaurant.name}
              category={restaurant.category}
              address={details?.address ?? "Montréal, QC"}
              specialty={details?.specialty ?? restaurant.description}
              rating={restaurant.averageRating ?? undefined}
              ratingCount={restaurant.ratingCount}
              status={restaurant.status.toLowerCase() as "open" | "paused" | "closed"}
              image={restaurant.imageUrl}
              onViewMenu={() => onSelectRestaurant(restaurant.id)}
            />;
          })}
        </div>
      </section>
    </main>
  );
}
