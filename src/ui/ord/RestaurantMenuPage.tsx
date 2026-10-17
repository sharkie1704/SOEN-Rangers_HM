import { useEffect, useRef, useState } from "react";
import MenuItemCard from "./MenuItemCard";
import "./button-interactions.css";


type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
  image: string;

};

const restaurantDetails: Record<number, {
  name: string;
  specialty: string;
  address: string;
  rating: number;
  reviewCount: number;
}> = {
  1: { name: "Sweet Dreams", specialty: "Cakes & pastries", address: "1250 Rue Sainte-Catherine O, Montréal, QC", rating: 4.6, reviewCount: 128 },
  2: { name: "Chocolate Heaven", specialty: "Chocolate desserts", address: "350 Rue Saint-Paul O, Montréal, QC", rating: 4.8, reviewCount: 214 },
  3: { name: "La Petite Pâtisserie", specialty: "French pastries & macarons", address: "45 Avenue du Mont-Royal O, Montréal, QC", rating: 4.7, reviewCount: 96 },
  4: { name: "Sugar Rush", specialty: "Ice cream & frozen treats", address: "2100 Rue Guy, Montréal, QC", rating: 4.5, reviewCount: 82 },
};

// Temporary menu items for the page layout
const menus: Record<number, MenuItem[]> = {
  1: [
    {
      id: 101,
      name: "Strawberry Shortcake",
      description: "Vanilla cake with fresh cream and strawberries.",
      price: 8.50,
      available: true,
      image: "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=800&auto=format&fit=crop&q=85",
    },
    {
      id: 102,
      name: "Chocolate Brownie",
      description: "Rich chocolate brownie with a fudgy centre.",
      price: 6.75,
      available: false,
      image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=85",
    },
  ],
  2: [
    {
      id: 201,
      name: "Chocolate Lava Cake",
      description: "Warm chocolate cake with a molten centre.",
      price: 9.25,
      available: true,
      image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=85",
    },
    {
      id: 202,
      name: "Fudge Brownie",
      description: "A rich brownie for chocolate lovers.",
      price: 7.00,
      available: false,
      image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=85",
    },
  ],
  3: [
    {
      id: 301,
      name: "French Macarons",
      description: "Delicate macarons in assorted flavours.",
      price: 8.95,
      available: true,
      image: "https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&auto=format&fit=crop&q=85",
    },
    {
      id: 302,
      name: "Classic Cheesecake",
      description: "Creamy cheesecake with a biscuit crust.",
      price: 7.95,
      available: false,
      image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=85",
    },
  ],
  4: [
    {
      id: 401,
      name: "Ice Cream Sundae",
      description: "Vanilla ice cream with chocolate sauce.",
      price: 7.50,
      available: true,
      image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=85",
    },
    {
      id: 402,
      name: "Chocolate Chip Cookies",
      description: "Soft cookies with chocolate chips.",
      price: 5.50,
      available: false,
      image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=85",
    },
  ],
};

type RestaurantMenuPageInputs = {
  restaurantId: number;
  onBack: () => void;
  onViewCart: () => void;
  cartCount: number;
  onAddToCart: (item: Omit<import("./PlaceOrderPage").CartItem, "quantity">) => void;
};

export default function RestaurantMenuPage({
  restaurantId, onBack, onViewCart, cartCount, onAddToCart
}: RestaurantMenuPageInputs) {
  const menuItems = menus[restaurantId] ?? [];
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

  const restaurant = restaurantDetails[restaurantId] ?? {
    name: "Restaurant",
    specialty: "Desserts",
    address: "Montréal, QC",
    rating: 0,
    reviewCount: 0,
  };


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
              margin: "0 0 16px",
            }}
          >
            {restaurant.name}
          </h1>

          <p style={{ color: "#4B3028", fontSize: "16px", margin: "0 0 8px" }}>
            {restaurant.specialty}
          </p>
          <p style={{ color: "#4B3028", fontSize: "15px", margin: "0 0 8px" }}>
            {restaurant.address}
          </p>
          <p style={{ color: "#4B3028", fontSize: "16px", margin: 0 }}>
            <span aria-label={`${restaurant.rating} out of 5 stars`}>
              {"★"} {restaurant.rating.toFixed(1)}
            </span>
            <span> ({restaurant.reviewCount} reviews)</span>
          </p>
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
