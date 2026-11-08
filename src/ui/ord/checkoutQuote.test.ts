import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutKey, fetchCheckoutQuote, placeQuotedOrder } from "./checkoutQuote";

afterEach(() => vi.unstubAllGlobals());

describe("checkout quote requests", () => {
    it("changes the key for restaurant, quantity and item changes", () => {
        const key = checkoutKey("a", [{ id: 1, quantity: 1 }]);
        expect(checkoutKey("b", [{ id: 1, quantity: 1 }])).not.toBe(key);
        expect(checkoutKey("a", [{ id: 1, quantity: 2 }])).not.toBe(key);
        expect(checkoutKey("a", [{ id: 2, quantity: 1 }])).not.toBe(key);
    });

    it("uses the authenticated client and sends only item IDs and quantities", async () => {
        const quote = { lines: [], fare: { totalCents: 1650 } };
        const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ quote }) });
        vi.stubGlobal("fetch", fetch);
        const key = checkoutKey("a", [{ id: 1, quantity: 2 }]);
        expect(await fetchCheckoutQuote(key)).toEqual(quote);
        expect(fetch).toHaveBeenCalledWith("/api/orders/quote", {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" }, body: key,
        });
    });

    it("preserves API validation errors for checkout to display", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: false, status: 400, json: async () => ({ error: "Quantity must be an integer between 1 and 50." }),
        }));
        await expect(fetchCheckoutQuote(checkoutKey("a", [{ id: 1, quantity: 0 }])))
            .rejects.toMatchObject({ status: 400, message: "Quantity must be an integer between 1 and 50." });
    });

    it("propagates network failures", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")));
        await expect(fetchCheckoutQuote(checkoutKey("a", [{ id: 1, quantity: 1 }])))
            .rejects.toThrow("Network unavailable");
    });

    it("sends the displayed total with placement and uses the returned order", async () => {
        const order = { id: 1, lines: [], fare: { totalCents: 1650 } };
        const fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ order }) });
        vi.stubGlobal("fetch", fetch);
        const key = checkoutKey("a", [{ id: 1, quantity: 1 }]);
        expect(await placeQuotedOrder(key, 1650)).toEqual(order);
        expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
            restaurantId: "a", lines: [{ menuItemId: 1, quantity: 1 }], expectedTotalCents: 1650,
        });
    });

    it("propagates a price conflict without retrying placement", async () => {
        const fetch = vi.fn().mockResolvedValue({ ok: false, status: 409,
            json: async () => ({ error: "Your order price changed." }) });
        vi.stubGlobal("fetch", fetch);
        await expect(placeQuotedOrder(checkoutKey("a", [{ id: 1, quantity: 1 }]), 1650))
            .rejects.toMatchObject({ status: 409, message: "Your order price changed." });
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
