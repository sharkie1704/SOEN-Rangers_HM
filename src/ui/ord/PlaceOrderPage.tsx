import { useEffect, useState } from "react";
import CartItemRow from "./CartItemRow";
import CheckoutFare from "./CheckoutFare";
import { checkoutKey, fetchCheckoutQuote, placeQuotedOrder, type CheckoutQuote } from "./checkoutQuote";
import type { FareBreakdown } from "../../domain/prc/FareBreakdown.ts";
import { ApiError } from "../reg/api/client";
import "./button-interactions.css";

export type CartItem = {
    id: number;
    name: string;
    price: number;
    quantity: number;
    image: string;
    available: boolean;
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
type PlacedOrderItem = Omit<CartItem, "available">;

type PlacedOrder = {
    id: number;
    status: string;
    totalCents: number;
    items: PlacedOrderItem[];
    fare: FareBreakdown;
};

export default function PlaceOrderPage({
    cartItems,
    restaurantId,
    onCartChange,
    onBackToRestaurants,
}: PlaceOrderPageInputs) {
    const restaurantName = restaurantNames[restaurantId] ?? "Restaurant";
    // null = order not placed yet; otherwise the order that was just placed
    const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [placeError, setPlaceError] = useState("");
    const [quoteState, setQuoteState] = useState<{ key: string; quote?: CheckoutQuote; error?: string } | null>(null);
    const [quoteAttempt, setQuoteAttempt] = useState(0);
    const key = checkoutKey(restaurantId, cartItems);
    const hasItems = cartItems.length > 0;
    const allSelectedItemsSoldOut = hasItems && cartItems.every((item) => item.available === false);
    const current = quoteState?.key === key ? quoteState : null;
    const quote = current?.quote;
    const quoteLoading = hasItems && !allSelectedItemsSoldOut && !quote && !current?.error;
    const canPlace = !!quote && !quoteLoading && !placingOrder && !allSelectedItemsSoldOut;

    useEffect(() => {
        let cancelled = false;
        setQuoteState(null);
        if (hasItems && !allSelectedItemsSoldOut) {
            fetchCheckoutQuote(key)
                .then((quote) => { if (!cancelled) setQuoteState({ key, quote }); })
                .catch((error: unknown) => {
                    if (!cancelled) setQuoteState({ key, error: error instanceof ApiError ? error.message : "Could not load your fare. Please try again." });
                });
        }
        return () => { cancelled = true; };
    }, [key, hasItems, allSelectedItemsSoldOut, quoteAttempt]);

    function changeQuantity(id: number, change: number) {
        onCartChange(
            cartItems.map((item) =>
                item.id === id
                    ? { ...item, quantity: Math.max(1, item.quantity + change) }
                    : item,
            ),
        );
    }

    function removeItem(id: number) {
        onCartChange(cartItems.filter((item) => item.id !== id));
    }

    async function placeOrder() {
        if (!canPlace || !quote) return;
        setPlacingOrder(true);
        setPlaceError("");
        try {
            const order = await placeQuotedOrder(key, quote.fare.totalCents);
            const items = order.lines.map((line) => ({
                id: line.menuItemId, name: line.name, quantity: line.quantity,
                price: line.unitPriceCents / 100,
                image: cartItems.find((item) => item.id === line.menuItemId)?.image ?? "",
            }));
            setPlacedOrder({ ...order, items });
            onCartChange([]);
        } catch (error) {
            setPlaceError(error instanceof ApiError ? error.message : "Could not place your order. Please try again.");
            // Never submit again automatically; get a fresh quote for the customer to review.
            setQuoteState(null);
            setQuoteAttempt((attempt) => attempt + 1);
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
                            <span>${(placedOrder.fare.totalCents / 100).toFixed(2)}</span>
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

    if (!hasItems) {
        return (
            <main style={pageStyle}>
                <h1 style={{ color: "#4B3028", textAlign: "center" }}>Your Cart</h1>
                <div role="status" style={{ textAlign: "center", color: "#4B3028", padding: "48px 16px" }}>
                    <svg aria-hidden="true" focusable="false" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#C89F7A" strokeWidth="1.5">
                        <path d="M2 3h3l3 12h11l3-9H6" />
                        <circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
                    </svg>
                    <p>Your cart is empty.</p>
                </div>
            </main>
        );
    }

    // ---------- Cart view ----------
    return (
        <main style={pageStyle}>
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <header style={{ textAlign: "center", marginBottom: "40px" }}>
                    <h1 style={{ color: "#4B3028", fontSize: "32px", margin: "0 0 16px" }}>
                        Your Cart
                    </h1>
                    <p style={{ color: "#4B3028", margin: 0 }}>
                        Ordering from {restaurantName}
                    </p>
                </header>

                    <section
                        aria-label="Items in your cart"
                        style={{ display: "grid", gap: "16px" }}
                    >
                        {cartItems.map((item) => (
                            <CartItemRow
                                key={item.id}
                                name={quote?.lines.find((line) => line.menuItemId === item.id)?.name ?? item.name}
                                price={(quote?.lines.find((line) => line.menuItemId === item.id)?.unitPriceCents ?? item.price * 100) / 100}
                                quantity={item.quantity}
                                image={item.image}
                                onIncrease={() => changeQuantity(item.id, 1)}
                                onDecrease={() => changeQuantity(item.id, -1)}
                                onRemove={() => removeItem(item.id)}
                            />
                        ))}
                    </section>

                {/* Order summary */}
                <section aria-label="Order summary" style={{ ...cardStyle, marginTop: "32px" }}>
                    {placeError && <p role="alert" style={{ color: "#9B1C1C" }}>{placeError}</p>}
                    {allSelectedItemsSoldOut && (
                        <p role="status">All selected items are sold out. Remove them or return to the menu to choose available items.</p>
                    )}
                    {quoteLoading && <p role="status">Updating your fare…</p>}
                    {current?.error && <div role="alert">
                        <p>{current.error}</p>
                        <button type="button" onClick={() => { setQuoteState(null); setQuoteAttempt((attempt) => attempt + 1); }}>Retry quote</button>
                    </div>}
                    {quote && <CheckoutFare fare={quote.fare} />}

                    <button
                        type="button"
                        className="interactive-button"
                        onClick={placeOrder}
                        disabled={!canPlace}
                        style={{
                            ...primaryButtonStyle,
                            backgroundColor: !canPlace ? "#BCA99B" : "#C66B32",
                            cursor: !canPlace ? "not-allowed" : "pointer",
                        }}
                    >
                        {placingOrder ? "Placing order…" : "Place Order"}
                    </button>
                </section>
            </div>
        </main>
    );
}
