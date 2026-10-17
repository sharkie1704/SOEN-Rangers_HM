import type { CSSProperties } from "react";

type CartItemRowData = {
    name: string;
    price: number;
    quantity: number;
    image: string;
    onIncrease: () => void;
    onDecrease: () => void;
    onRemove: () => void;
};

// Shared look for the round − and + buttons
const stepButtonStyle: CSSProperties = {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "1px solid #C66B32",
    backgroundColor: "#FFF9F2",
    color: "#C66B32",
    fontFamily: "inherit",
    fontSize: "18px",
    fontWeight: 600,
    lineHeight: 1,
    padding: 0,
};

export default function CartItemRow({
    name,
    price,
    quantity,
    image,
    onIncrease,
    onDecrease,
    onRemove,
}: CartItemRowData) {
    // The minus button is disabled at 1; use "Remove" to take an item out
    const atMinimum = quantity <= 1;

    return (
        <article
            style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "20px",
                backgroundColor: "#EADBC8",
                border: "1px solid #C89F7A",
                borderRadius: "14px",
                padding: "16px",
            }}
        >
            {/* Item image */}
            <img
                src={image}
                alt={name}
                style={{
                    width: "90px",
                    height: "90px",
                    objectFit: "cover",
                    borderRadius: "10px",
                }}
            />

            {/* Name and unit price */}
            <div style={{ flex: "1 1 160px" }}>
                <h3 style={{ color: "#4B3028", margin: "0 0 6px", fontSize: "18px" }}>
                    {name}
                </h3>
                <p style={{ color: "#4B3028", margin: 0, fontSize: "14px" }}>
                    ${price.toFixed(2)} each
                </p>
            </div>

            {/* Quantity controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                    type="button"
                    aria-label={`Decrease quantity of ${name}`}
                    onClick={onDecrease}
                    disabled={atMinimum}
                    style={{
                        ...stepButtonStyle,
                        opacity: atMinimum ? 0.4 : 1,
                        cursor: atMinimum ? "not-allowed" : "pointer",
                    }}
                >
                    −
                </button>

                <span
                    style={{
                        color: "#4B3028",
                        fontWeight: 600,
                        minWidth: "24px",
                        textAlign: "center",
                    }}
                >
                    {quantity}
                </span>

                <button
                    type="button"
                    aria-label={`Increase quantity of ${name}`}
                    onClick={onIncrease}
                    style={{ ...stepButtonStyle, cursor: "pointer" }}
                >
                    +
                </button>
            </div>

            {/* Line total (price x quantity) */}
            <p
                style={{
                    color: "#4B3028",
                    fontSize: "18px",
                    fontWeight: 600,
                    margin: 0,
                    minWidth: "80px",
                    textAlign: "right",
                }}
            >
                ${(price * quantity).toFixed(2)}
            </p>

            {/* Remove the item completely */}
            <button
                type="button"
                onClick={onRemove}
                style={{
                    background: "none",
                    border: "none",
                    color: "#923C32",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 600,
                    padding: 0,
                }}
            >
                Remove
            </button>
        </article>
    );
}