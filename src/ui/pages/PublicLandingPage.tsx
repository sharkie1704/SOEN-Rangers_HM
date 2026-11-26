import { Link, useNavigate } from "react-router-dom";
import { useApi } from "../reg/api/useApi";
import { api } from "../reg/api/client";
import RestaurantCard from "../ord/RestaurantCard";
import { getRestaurantDemoDetails } from "../ord/restaurantDemoDetails";
import "./public-landing.css";

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

const categories = [
  { name: "Waffles", image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=560&q=85" },
  { name: "Cakes", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=560&q=85" },
  { name: "Ice cream", image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=560&q=85" },
  { name: "Cookies", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=560&q=85" },
  { name: "Brownies", image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=560&q=85" },
  { name: "Macarons", image: "https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&w=560&q=85" },
];

export default function PublicLandingPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useApi(
    () => api<{ restaurants: Restaurant[] }>("/api/public/restaurants"),
    "Could not load local dessert spots.",
  );
  const featuredNames = ["Brownie & Crumb", "Sweet Spot", "Macaron Maison", "Waffle & Crumb"];
  const normalizeName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const restaurants = [...(data?.restaurants ?? [])]
    .filter((restaurant) => restaurant.status === "OPEN" && featuredNames.includes(normalizeName(restaurant.name)))
    .sort((first, second) => {
      const firstIndex = featuredNames.indexOf(normalizeName(first.name));
      const secondIndex = featuredNames.indexOf(normalizeName(second.name));
      return (firstIndex < 0 ? Number.MAX_SAFE_INTEGER : firstIndex) - (secondIndex < 0 ? Number.MAX_SAFE_INTEGER : secondIndex);
    });

  return (
    <main className="public-landing">
      <header className="public-header">
        <Link className="public-brand" to="/" aria-label="DessertDash home">
          <svg className="public-brand__mark" aria-hidden="true" viewBox="0 0 40 40" fill="none"><path d="M8 18h24l-2 18H10L8 18Z" /><path d="M12 18c0-4 3-6 8-6s8 2 8 6M15 10c0-3 2-4 4-5M22 10c0-3 2-4 4-5M14 22v10m6-10v10m6-10v10" /></svg><span>Dessert<span>Dash</span></span>
        </Link>
        <nav aria-label="Account">
          <Link className="public-header__login" to="/login">Log in</Link>
          <Link className="public-header__signup" to="/register">Sign up</Link>
        </nav>
      </header>

      <section className="public-hero" aria-labelledby="public-hero-title">
        <div className="public-hero__content">
          <p className="public-eyebrow">A LITTLE JOY, DELIVERED</p>
          <h1 id="public-hero-title">Craving something sweet?</h1>
          <p>Order from your favourite dessert spots right here in Montréal.</p>
          <Link className="public-hero__action" to="/register">Find desserts <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <div className="public-home-content">
        <section className="public-categories" aria-labelledby="category-title">
          <div className="public-section-heading">
            <div><p className="public-eyebrow">FIND YOUR FAVOURITE</p><h2 id="category-title">Explore by category</h2></div>
          </div>
          <div className="public-category-grid">
            {categories.map((category) => (
              <Link className="public-category" key={category.name} to="/register">
                <img src={category.image} alt="" loading="lazy" />
                <span>{category.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="public-spots" aria-labelledby="spots-title">
          <div className="public-section-heading public-section-heading--row">
            <div><p className="public-eyebrow">MADE LOCALLY, LOVED LOCALLY</p><h2 id="spots-title">Discover local dessert spots</h2></div>
            <Link to="/register" className="public-view-all">View all restaurants <span aria-hidden="true">→</span></Link>
          </div>
          {loading && <p role="status">Finding sweet spots…</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && restaurants.length === 0 && <p>New dessert spots are coming soon.</p>}
          <div className="public-restaurant-grid">
            {restaurants.map((restaurant) => {
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
                actionLabel="Sign up to order"
                onViewMenu={() => navigate("/register")}
              />;
            })}
          </div>
        </section>
      </div>

      <footer className="public-footer">
        <Link className="public-brand public-brand--small" to="/" aria-label="DessertDash home"><svg className="public-brand__mark" aria-hidden="true" viewBox="0 0 40 40" fill="none"><path d="M8 18h24l-2 18H10L8 18Z" /><path d="M12 18c0-4 3-6 8-6s8 2 8 6M15 10c0-3 2-4 4-5M22 10c0-3 2-4 4-5M14 22v10m6-10v10m6-10v10" /></svg><span>Dessert<span>Dash</span></span></Link>
        <p>Local treats, delivered with love.</p>
      </footer>
    </main>
  );
}
