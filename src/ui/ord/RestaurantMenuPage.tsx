import { useEffect, useRef, useState } from "react";
import MenuItemCard from "./MenuItemCard";
import { api } from "../reg/api/client";
import "./button-interactions.css";


type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
  image: string;

};

type Restaurant = {
  name: string;
  category: string;
  description: string;
  status: "OPEN" | "PAUSED" | "CLOSED";
};

type ApiMenuItem = Omit<MenuItem, "price" | "image"> & {
  priceCents: number;
  imageUrl: string;
};

type RestaurantMenuPageInputs = {
  restaurantId: string;
  onBack: () => void;
  onViewCart: () => void;
  cartCount: number;
  onAddToCart: (item: Omit<import("./PlaceOrderPage").CartItem, "quantity">) => void;
};

export default function RestaurantMenuPage({
  restaurantId, onBack, onViewCart, cartCount, onAddToCart
}: RestaurantMenuPageInputs) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setRestaurant(null);
    setMenuItems([]);

    async function loadMenu() {
      try {
        const path = `/api/restaurants/${encodeURIComponent(restaurantId)}`;
        const [details, menu] = await Promise.all([
          api<{ restaurant: Restaurant }>(path),
          api<{ menuItems: ApiMenuItem[] }>(`${path}/menu`),
        ]);
        if (!cancelled) {
          setRestaurant(details.restaurant);
          setMenuItems(menu.menuItems.map((item) => ({
            ...item,
            price: item.priceCents / 100,
            image: item.imageUrl,
          })));
        }
      } catch {
        if (!cancelled) setError("Could not load menu. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMenu();
    return () => { cancelled = true; };
  }, [restaurantId]);
  const [addedItemName, setAddedItemName] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
  }, []);

  function addItemToCart(item: MenuItem) {
    onAddToCart(item);
    setAddedItemName(item.name);
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setAddedItemName(null), 2200);
  }

  return (
    <main
      style={{
        backgroundColor: "#FFF9F2",
        minHeight: "100vh",
        padding: "40px 24px",
        boxSizing: "border-box",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <button
            type="button"
            className="interactive-button"
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: "#C66B32",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
              padding: 0,
            }}
          >
            ← Back to restaurants
          </button>

          <button
            type="button"
            className="interactive-button"
            onClick={onViewCart}
            style={{
              padding: "10px 18px",
              backgroundColor: "#C66B32",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              fontFamily: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View Cart ({cartCount})
          </button>
        </div>

        {/* Restaurant heading */}
        <header
          style={{
            textAlign: "center",
            marginBottom: "48px",
          }}
        >
          <h1
            style={{
              color: "#4B3028",
              fontSize: "32px",
              lineHeight: 1.2,
              margin: "0 ",
            }}
          >
            {restaurant?.name ?? "Restaurant"}
          </h1>
          {/* Display the restaurant status only when its data is loaded */}
          {restaurant && (  
          <span
            style={{
              display: "inline-block",
              marginTop: "12px",
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor:
                restaurant.status === "OPEN"
                  ? "#DCEEDC"
                  : restaurant.status === "PAUSED"
                  ? "#FFF0CD"
                  : "#F2D8D5",
              color:
                restaurant.status === "OPEN"
                  ? "#28633A"
                  : restaurant.status === "PAUSED"
                  ? "#835900"
                  : "#923C32",
            }}
          >
            {restaurant.status.charAt(0) +
              restaurant.status.slice(1).toLowerCase()}
          </span>
        )}

          
        </header>

        {/* Menu section */}
        <section aria-labelledby="menu-heading">
          <h2
            id="menu-heading"
            style={{
              color: "#4B3028",
              fontSize: "28px",
              marginBottom: "24px",
            }}
          >
            Our Menu
          </h2>

          {/* Menu item cards */}
          {loading && <p>Loading menu...</p>}

          {error && <p role="alert">{error}</p>}

          {!loading && !error && menuItems.length === 0 && (
            <p>No desserts available yet.</p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(100%, 250px), 1fr))",
              gap: "24px",
              maxWidth: "900px",
            }}
          >
            {menuItems.map((item) => (
              <MenuItemCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                available={item.available}
                image={item.image}
                onAddToCart={() => addItemToCart(item)}
              />
            ))}
          </div>
        </section>
      </div>
      {addedItemName !== null && (
        <div
          className="cart-toast"
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            right: "24px",
            bottom: "24px",
            zIndex: 10,
            padding: "14px 20px",
            borderRadius: "10px",
            backgroundColor: "#28633A",
            color: "#FFFFFF",
            boxShadow: "0 6px 18px rgb(0 0 0 / 18%)",
            animation: "cart-toast-in 180ms ease-out",
          }}
        >
          ✓ {addedItemName} added to cart
        </div>
      )}
      <style>{`@keyframes cart-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } @media (prefers-reduced-motion: reduce) { .cart-toast { animation: none !important; } }`}</style>
    </main >
  );
}
