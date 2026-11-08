import type { FareBreakdown } from "../../domain/prc/FareBreakdown.ts";

export default function CheckoutFare({ fare }: { fare: FareBreakdown }) {
    const rows: [string, number][] = [
        ["Subtotal", fare.subtotalCents],
        ["Delivery fee", fare.deliveryFeeCents],
        ["Service fee", fare.serviceFeeCents],
    ];
    if (fare.smallOrderSurchargeCents > 0) {
        rows.push(["Small-order surcharge", fare.smallOrderSurchargeCents]);
    }
    return (
        <div aria-label="Fare breakdown" aria-live="polite">
            {rows.map(([label, cents]) => (
                <p key={label} style={{ display: "flex", justifyContent: "space-between", color: "#4B3028", margin: "0 0 12px" }}>
                    <span>{label}</span><span>${(cents / 100).toFixed(2)}</span>
                </p>
            ))}
            <p style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #C89F7A", paddingTop: 16, color: "#4B3028", fontSize: 20, fontWeight: 600 }}>
                <span>Total</span><span>${(fare.totalCents / 100).toFixed(2)}</span>
            </p>
        </div>
    );
}
