import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CheckoutFare from "./CheckoutFare";

const fare = { subtotalCents: 1000, deliveryFeeCents: 300, serviceFeeCents: 150,
    smallOrderSurchargeCents: 200, totalCents: 1650 };

describe("checkout fare display", () => {
    it("displays the server breakdown in dollars with two decimal places", () => {
        const html = renderToStaticMarkup(createElement(CheckoutFare, { fare }));
        for (const text of ["Subtotal", "Delivery fee", "Service fee", "Small-order surcharge", "Total",
            "$10.00", "$3.00", "$1.50", "$2.00", "$16.50"]) {
            expect(html).toContain(text);
        }
    });

    it("hides a zero surcharge and displays the supplied total without recalculating it", () => {
        const html = renderToStaticMarkup(createElement(CheckoutFare, {
            fare: { ...fare, smallOrderSurchargeCents: 0, totalCents: 1450 },
        }));
        expect(html).not.toContain("Small-order surcharge");
        expect(html).toContain("$14.50");
    });
});
