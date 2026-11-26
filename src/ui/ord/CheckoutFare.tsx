import type { FareBreakdown } from "../../domain/prc/FareBreakdown.ts";

function dollars(cents: number): string {
    return "$" + (cents / 100).toFixed(2);
}

export default function CheckoutFare({ fare }: { fare: FareBreakdown }) {
    const rows: [string, string][] = [
        ["Subtotal", dollars(fare.subtotalCents)],
        ["Delivery fee", dollars(fare.deliveryFeeCents)],
        ["Service fee", dollars(fare.serviceFeeCents)],
    ];
    if (fare.smallOrderSurchargeCents > 0) {
        rows.push(["Small-order surcharge", dollars(fare.smallOrderSurchargeCents)]);
    }
    if (fare.promo) {
        rows.push(["Promo (" + fare.promo.code + ")", "−" + dollars(fare.promo.discountCents)]);
    }
    return (
        <div aria-label="Fare breakdown" aria-live="polite">
            {rows.map(([label, amount]) => (
                <p key={label} style={{ display: "flex", justifyContent: "space-between", color: "#4B3028", margin: "0 0 12px" }}>
                    <span>{label}</span><span>{amount}</span>
                </p>
            ))}
            <p style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #C89F7A", paddingTop: 16, color: "#4B3028", fontSize: 20, fontWeight: 600 }}>
                <span>Total</span><span>{dollars(fare.totalCents)}</span>
            </p>
        </div>
    );
}
