import { useState } from "react";
import RestaurantListPage from "./RestaurantListPage";
import RestaurantMenuPage from "./RestaurantMenuPage";
import PlaceOrderPage, { type CartItem } from "./PlaceOrderPage";
import CustomerOrderHistory from "./CustomerOrderHistory";

export default function CustomerFlow() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // navigate to the cart page (opened from the menu page)
  if (showCart) {
    return (
      <PlaceOrderPage
        cartItems={cartItems}
        restaurantId={selectedRestaurantId ?? ""}
        onCartChange={setCartItems}
        onBack={() => setShowCart(false)}
        onBackToRestaurants={() => {
          setShowCart(false);
          setSelectedRestaurantId(null);
        }}
      />
    );
  }

  //navigate to the selected menu page 
  if (selectedRestaurantId !== null) {
    return (
      <RestaurantMenuPage
        restaurantId={selectedRestaurantId}
        onBack={() => setSelectedRestaurantId(null)}
        onViewCart={() => setShowCart(true)}
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onAddToCart={(item) =>
          setCartItems((current) => {
            const existing = current.find((c) => c.id === item.id);
            return existing
              ? current.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c))
              : [...current, { ...item, quantity: 1 }];
          })
        }
      />
    );
  }

  return (
    <>
      <nav aria-label="Customer pages" style={{ display: "flex", justifyContent: "center", gap: 12, padding: 16 }}>
        <button type="button" onClick={() => setShowHistory(false)} aria-current={!showHistory ? "page" : undefined}>Browse restaurants</button>
        <button type="button" onClick={() => setShowHistory(true)} aria-current={showHistory ? "page" : undefined}>Order history</button>
      </nav>
      {showHistory ? <CustomerOrderHistory /> : <RestaurantListPage onSelectRestaurant={setSelectedRestaurantId} />}
    </>
  );
}
