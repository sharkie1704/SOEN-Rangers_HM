import { useState } from "react";
import RestaurantListPage from "./RestaurantListPage";
import RestaurantMenuPage from "./RestaurantMenuPage";
import PlaceOrderPage, { type CartItem } from "./PlaceOrderPage";
import OrderTrackingPage from "./OrderTrackingPage";

export default function CustomerFlow() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showOrders, setShowOrders] = useState(false);

  if (showOrders) {
    return <OrderTrackingPage onBack={() => setShowOrders(false)} />;
  }

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
        onViewOrders={() => {
          setShowCart(false);
          setSelectedRestaurantId(null);
          setShowOrders(true);
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

  return <RestaurantListPage onSelectRestaurant={setSelectedRestaurantId} onViewOrders={() => setShowOrders(true)} />;
}
