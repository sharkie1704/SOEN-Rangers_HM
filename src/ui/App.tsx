// routes

import { useState } from "react";
import RestaurantListPage from "./ord/RestaurantListPage";
import RestaurantMenuPage from "./ord/RestaurantMenuPage";
import PlaceOrderPage, {
  type CartItem,
} from "./ord/PlaceOrderPage";

export default function App() {

  const [selectedRestaurantId, setSelectedRestaurantId] =
    useState<number | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  // navigate to the cart page (opened from the menu page)
  if (showCart) {
    return (
      <PlaceOrderPage
        cartItems={cartItems}
        restaurantId={selectedRestaurantId ?? 0}
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
        onAddToCart={(item) => setCartItems((current) => {
          const existing = current.find((cartItem) => cartItem.id === item.id);
          return existing
            ? current.map((cartItem) => cartItem.id === item.id
                ? { ...cartItem, quantity: cartItem.quantity + 1 }
                : cartItem)
            : [...current, { ...item, quantity: 1 }];
        })}
      />
    );
  }
  return (
    <RestaurantListPage
      onSelectRestaurant={setSelectedRestaurantId}
    />
  );
}
