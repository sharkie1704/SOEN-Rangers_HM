import { useEffect, useState } from "react";
import RestaurantListPage from "./RestaurantListPage";
import RestaurantMenuPage from "./RestaurantMenuPage";
import PlaceOrderPage, { type CartItem } from "./PlaceOrderPage";
import CustomerOrderHistory from "./CustomerOrderHistory";
import "./customer-flow.css";

export type CustomerView = "browse" | "menu" | "cart" | "orders";

interface Props {
  activeView?: CustomerView;
  onNavigate?: (view: CustomerView) => void;
  openRestaurantId?: string | null;
  onRestaurantOpened?: () => void;
}

export default function CustomerFlow({ activeView, onNavigate, openRestaurantId, onRestaurantOpened }: Props) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartRestaurantId, setCartRestaurantId] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState("");
  const [localView, setLocalView] = useState<CustomerView>("browse");
  const [historyVisited, setHistoryVisited] = useState(false);
  const view = activeView ?? localView;

  function navigate(next: CustomerView) {
    setLocalView(next);
    onNavigate?.(next);
  }

  function updateCart(items: CartItem[]) {
    setCartItems(items);
    if (items.length === 0) setCartRestaurantId(null);
  }

  function selectRestaurant(restaurantId: string) {
    if (cartItems.length > 0 && cartRestaurantId && cartRestaurantId !== restaurantId) {
      setCartNotice("Your cart contains items from another restaurant. Finish or clear that cart first.");
      return;
    }
    setCartNotice("");
    if (cartItems.length === 0) setCartRestaurantId(restaurantId);
    setSelectedRestaurantId(restaurantId);
    navigate("menu");
  }

  useEffect(() => {
    if (!openRestaurantId) return;
    selectRestaurant(openRestaurantId);
    onRestaurantOpened?.();
  }, [openRestaurantId]);

  useEffect(() => {
    if (view === "orders") setHistoryVisited(true);
  }, [view]);

  return (
    <>
      {activeView === undefined && (
        <nav className="customer-tabs" aria-label="Customer pages">
          {([ ["browse", "Browse Restaurants"], ["cart", "My Cart"], ["orders", "My Orders"] ] as const).map(([id, label]) => (
            <button key={id} className="customer-tab" type="button" onClick={() => navigate(id)} aria-current={(view === "menu" ? "browse" : view) === id ? "page" : undefined}>{label}</button>
          ))}
        </nav>
      )}
      {view === "browse" && <>
        {cartNotice && <p role="status" className="customer-flow-notice">{cartNotice}</p>}
        <RestaurantListPage onSelectRestaurant={selectRestaurant} />
      </>}
      {view === "menu" && (selectedRestaurantId ? (
        <RestaurantMenuPage
          restaurantId={selectedRestaurantId}
          onBack={() => navigate("browse")}
          onViewCart={() => navigate("cart")}
          cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
          onAddToCart={(item) => {
            setCartRestaurantId(selectedRestaurantId);
            setCartItems((current) => {
              const existing = current.find((entry) => entry.id === item.id);
              return existing
                ? current.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry)
                : [...current, { ...item, quantity: 1 }];
            });
          }}
        />
      ) : <section className="customer-flow-empty"><h1>Restaurant Menu</h1><p>Select a restaurant to see its menu.</p><button type="button" onClick={() => navigate("browse")}>Browse Restaurants</button></section>)}
      <div hidden={view !== "cart"}>
        {view === "cart" && <PlaceOrderPage
          cartItems={cartItems}
          restaurantId={cartRestaurantId ?? selectedRestaurantId ?? ""}
          onCartChange={updateCart}
          onBack={() => navigate(selectedRestaurantId ? "menu" : "browse")}
          onBackToRestaurants={() => navigate("browse")}
        />}
      </div>
      <div hidden={view !== "orders"}>
        {(view === "orders" || historyVisited) && <CustomerOrderHistory />}
      </div>
    </>
  );
}
