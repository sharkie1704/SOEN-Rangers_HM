import { useState } from "react";
import RestaurantListPage from "./RestaurantListPage";
import RestaurantMenuPage from "./RestaurantMenuPage";
import PlaceOrderPage, { type CartItem } from "./PlaceOrderPage";
import CustomerOrderHistory from "./CustomerOrderHistory";
import { recordOutput } from "../console/outputLog";
import "./customer-flow.css";

export default function CustomerFlow() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartRestaurantId, setCartRestaurantId] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  function updateCart(items: CartItem[]) {
    setCartItems(items);
    if (items.length === 0) setCartRestaurantId(null);
  }

  // navigate to the cart page (opened from the menu page)
  if (showCart) {
    return (
      <PlaceOrderPage
        cartItems={cartItems}
        restaurantId={selectedRestaurantId ?? ""}
        onCartChange={updateCart}
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
        onAddToCart={(item) => {
          setCartRestaurantId(selectedRestaurantId);
          recordOutput(`Added ${item.name} to the cart`);
          setCartItems((current) => {
            const existing = current.find((c) => c.id === item.id);
            return existing
              ? current.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c))
              : [...current, { ...item, quantity: 1 }];
          });
        }}
      />
    );
  }

  return (
    <>
      <nav className="customer-tabs" aria-label="Customer pages">
        <button className="customer-tab" type="button" onClick={() => setShowHistory(false)} aria-current={!showHistory ? "page" : undefined}>Browse restaurants</button>
        <button className="customer-tab" type="button" onClick={() => setShowHistory(true)} aria-current={showHistory ? "page" : undefined}>My Orders</button>
      </nav>
      {showHistory ? <CustomerOrderHistory /> : <>
        {cartNotice && <p role="status" style={{ textAlign: "center", color: "#923C32" }}>{cartNotice}</p>}
        <RestaurantListPage onSelectRestaurant={(restaurantId) => {
          if (cartItems.length > 0 && cartRestaurantId && cartRestaurantId !== restaurantId) {
            const message = "Your cart contains items from another restaurant. Finish or clear that cart first.";
            setCartNotice(message);
            recordOutput(message, "error");
            return;
          }
          setCartNotice("");
          if (cartItems.length === 0) setCartRestaurantId(restaurantId);
          setSelectedRestaurantId(restaurantId);
        }} />
      </>}
    </>
  );
}
