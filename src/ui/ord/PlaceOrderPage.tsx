import { useEffect, useState } from "react";
import CartItemRow from "./CartItemRow";
import { api, ApiError } from "../reg/api/client";
import { recordOutput } from "../console/outputLog";
import "./button-interactions.css";

export type CartItem = {
    id: number;
    name: string;
    price: number;
    quantity: number;
    image: string;
};

const restaurantNames: Record<string, string> = {
    1: "Sweet Dreams",
    2: "Chocolate Heaven",
    3: "La Petite Pâtisserie",
    4: "Sugar Rush",
};

type PlaceOrderPageInputs = {
    cartItems: CartItem[]; // the cart is owned by App.tsx so the menu page can see it too
    restaurantId: string;
    onCartChange: (items: CartItem[]) => void;
    onBack: () => void; // back to the restaurant's menu
    onBackToRestaurants: () => void; // after the order is placed
};

// What we remember about an order once it has been placed
type PlacedOrder = {
    id: number;
    status: string;
    totalCents: number;
    items: CartItem[];
};

function sumTotal(items: CartItem[]) {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export default function PlaceOrderPage({
    cartItems,
    restaurantId,
    onCartChange,
    onBack,
    onBackToRestaurants,
}: PlaceOrderPageInputs) {
    const restaurantName = restaurantNames[restaurantId] ?? "Restaurant";
    // null = order not placed yet; otherwise the order that was just placed
    const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [placeError, setPlaceError] = useState("");
    const [restaurantOpen, setRestaurantOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        api<{ restaurant: { status: "OPEN" | "PAUSED" | "CLOSED" } }>(`/api/restaurants/${encodeURIComponent(restaurantId)}`)
            .then(({ restaurant }) => { if (!cancelled) setRestaurantOpen(restaurant.status === "OPEN"); })
            .catch(() => { if (!cancelled) setRestaurantOpen(false); });
        return () => { cancelled = true; };
    }, [restaurantId]);

    // Totals are calculated from the cart every time it changes
    const total = sumTotal(cartItems);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    function changeQuantity(id: number, change: number) {
        const item = cartItems.find((cartItem) => cartItem.id === id);
        if (item) recordOutput(`${change > 0 ? "Increased" : "Decreased"} ${item.name} quantity`);
        onCartChange(
            cartItems.map((item) =>
                item.id === id
                    ? { ...item, quantity: Math.max(1, item.quantity + change) }
                    : item,
            ),
        );
    }

    function removeItem(id: number) {
        const item = cartItems.find((cartItem) => cartItem.id === id);
        if (item) recordOutput(`Removed ${item.name} from the cart`);
        onCartChange(cartItems.filter((item) => item.id !== id));
    }

    async function placeOrder() {
        if (placingOrder || cartItems.length === 0 || restaurantOpen !== true) return;
        setPlacingOrder(true);
        setPlaceError("");
        try {
            const result = await api<{ order: { id: number; status: string; totalCents: number } }>("/api/orders", {
                method: "POST",
                body: {
                    restaurantId,
                    lines: cartItems.map((item) => ({ menuItemId: item.id, quantity: item.quantity })),
                },
            });
            setPlacedOrder({ ...result.order, items: cartItems });
            onCartChange([]);
        } catch (error) {
            setPlaceError(error instanceof ApiError ? error.message : "Could not place your order. Please try again.");
        } finally {
            setPlacingOrder(false);
        }
    }

    const pageStyle = {
        backgroundColor: "#FFF9F2",
        minHeight: "100vh",
        padding: "40px 24px",
        boxSizing: "border-box",
        fontFamily: "'Poppins', sans-serif",
    } as const;

    const cardStyle = {
        backgroundColor: "#EADBC8",
        border: "1px solid #C89F7A",
        borderRadius: "14px",
        padding: "24px",
    } as const;

    const primaryButtonStyle = {
        display: "block",
        width: "100%",
        padding: "12px 18px",
        backgroundColor: "#C66B32",
        color: "#FFFFFF",
        border: "none",
        borderRadius: "8px",
        fontFamily: "inherit",
        fontSize: "16px",
        fontWeight: 600,
        cursor: "pointer",
    } as const;

    if (placingOrder) {
        return (
            <main style={{ ...pageStyle, display: "grid", placeItems: "center" }}>
                <section role="status" aria-live="polite" style={{ textAlign: "center", color: "#4B3028" }}>
                    <div className="order-loading-spinner" aria-hidden="true" />
                    <h1 style={{ marginBottom: 8 }}>Placing your order</h1>
                    <p style={{ marginTop: 0 }}>Sending it to {restaurantName}…</p>
                    <style>{`@keyframes order-spin { to { transform: rotate(360deg); } } .order-loading-spinner { width: 42px; height: 42px; margin: 0 auto 20px; border: 4px solid #EADBC8; border-top-color: #C66B32; border-radius: 50%; animation: order-spin 800ms linear infinite; } @media (prefers-reduced-motion: reduce) { .order-loading-spinner { animation-duration: 2s; } }`}</style>
                </section>
            </main>
        );
    }

    // ---------- Order confirmation view ----------
    if (placedOrder !== null) {
        return (
            <main style={pageStyle}>
                <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                    <header style={{ textAlign: "center", marginBottom: "32px" }}>
                        <h1 style={{ color: "#4B3028", fontSize: "32px", margin: "0 0 16px" }}>
                            Thank you! Your order is in
                        </h1>
                        <p style={{ color: "#4B3028", margin: 0 }}>
                            {restaurantName} will review it shortly.
                        </p>
                    </header>

                    <section aria-label="Order confirmation" style={cardStyle}>
                        <p style={{ color: "#4B3028", margin: "0 0 12px" }}>
                            Order ID: <strong>{placedOrder.id}</strong>
                        </p>

                        <p style={{ color: "#4B3028", margin: "0 0 20px" }}>
                            Status:{" "}
                            <span
                                style={{
                                    display: "inline-block",
                                    padding: "6px 12px",
                                    borderRadius: "20px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    backgroundColor: "#FFF0CD",
                                    color: "#835900",
                                }}
                            >
                                {placedOrder.status}
                            </span>
                        </p>

                        {/* What was ordered */}
                        <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0 }}>
                            {placedOrder.items.map((item) => (
                                <li
                                    key={item.id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        color: "#4B3028",
                                        marginBottom: "8px",
                                    }}
                                >
                                    <span>
                                        {item.quantity} × {item.name}
                                    </span>
                                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>

                        <p
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                borderTop: "1px solid #C89F7A",
                                paddingTop: "16px",
                                margin: 0,
                                color: "#4B3028",
                                fontSize: "18px",
                                fontWeight: 600,
                            }}
                        >
                            <span>Total</span>
                            <span>${(placedOrder.totalCents / 100).toFixed(2)}</span>
                        </p>
                    </section>

                    <button
                        type="button"
                        className="interactive-button"
                        onClick={onBackToRestaurants}
                        style={{ ...primaryButtonStyle, marginTop: "24px" }}
                    >
                        Back to restaurants
                    </button>
                </div>
            </main>
        );
    }

    // ---------- Cart view ----------
    return (
        <main style={pageStyle}>
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                {/* Back navigation */}
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
                        marginBottom: "32px",
                        padding: 0,
                    }}
                >
                    ← Back to menu
                </button>

                <header style={{ textAlign: "center", marginBottom: "40px" }}>
                    <h1 style={{ color: "#4B3028", fontSize: "32px", margin: "0 0 16px" }}>
                        Your Cart
                    </h1>
                    <p style={{ color: "#4B3028", margin: 0 }}>
                        Ordering from {restaurantName}
                    </p>
                </header>

                {cartItems.length === 0 ? (
                    <p style={{ color: "#4B3028", textAlign: "center" }}>
                        Your cart is empty. Head back to the menu to add something sweet!
                    </p>
                ) : (
                    <section
                        aria-label="Items in your cart"
                        style={{ display: "grid", gap: "16px" }}
                    >
                        {cartItems.map((item) => (
                            <CartItemRow
                                key={item.id}
                                name={item.name}
                                price={item.price}
                                quantity={item.quantity}
                                image={item.image}
                                onIncrease={() => changeQuantity(item.id, 1)}
                                onDecrease={() => changeQuantity(item.id, -1)}
                                onRemove={() => removeItem(item.id)}
                            />
                        ))}
                    </section>
                )}

                {/* Order summary */}
                <section aria-label="Order summary" style={{ ...cardStyle, marginTop: "32px" }}>
                    {placeError && <p role="alert" style={{ color: "#9B1C1C" }}>{placeError}</p>}
                    {restaurantOpen === false && <p role="status" style={{ color: "#923C32" }}>This restaurant is paused or closed. Ordering is unavailable.</p>}
                    <p
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "#4B3028",
                            margin: "0 0 12px",
                        }}
                    >
                        <span>Items ({itemCount})</span>
                        <span>${total.toFixed(2)}</span>
                    </p>

                    <p
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            borderTop: "1px solid #C89F7A",
                            paddingTop: "16px",
                            margin: "0 0 20px",
                            color: "#4B3028",
                            fontSize: "20px",
                            fontWeight: 600,
                        }}
                    >
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </p>

                    <button
                        type="button"
                        className="interactive-button"
                        onClick={placeOrder}
                        disabled={cartItems.length === 0 || placingOrder || !restaurantOpen}
                        style={{
                            ...primaryButtonStyle,
                            backgroundColor: cartItems.length === 0 || placingOrder || !restaurantOpen ? "#BCA99B" : "#C66B32",
                            cursor: cartItems.length === 0 || placingOrder || !restaurantOpen ? "not-allowed" : "pointer",
                        }}
                    >
                        {placingOrder ? "Placing order…" : "Place Order"}
                    </button>
                </section>
            </div>
        </main>
    );
}
