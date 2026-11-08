import type { FareBreakdown } from "../../domain/prc/FareBreakdown.ts";
import type { OrderLineDTO } from "../../domain/ord/OrderLineDTO.ts";
import { api } from "../reg/api/client";

export interface CheckoutQuote {
    lines: readonly OrderLineDTO[];
    fare: FareBreakdown;
}

// The key also serves as the request body; local names and prices are never sent.
export function checkoutKey(restaurantId: string, items: readonly { id: number; quantity: number }[]) {
    return JSON.stringify({ restaurantId, lines: items.map(({ id, quantity }) => ({ menuItemId: id, quantity })) });
}

export async function fetchCheckoutQuote(key: string): Promise<CheckoutQuote> {
    const { quote } = await api<{ quote: CheckoutQuote }>("/api/orders/quote", {
        method: "POST",
        body: JSON.parse(key),
    });
    return quote;
}

export async function placeQuotedOrder(key: string, expectedTotalCents: number) {
    const { order } = await api<{ order: {
        id: number; status: string; totalCents: number;
        lines: readonly OrderLineDTO[]; fare: FareBreakdown;
    } }>("/api/orders", {
        method: "POST",
        body: { ...JSON.parse(key), expectedTotalCents },
    });
    return order;
}
