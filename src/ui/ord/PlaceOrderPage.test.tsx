import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PlaceOrderPage, { type CartItem } from "./PlaceOrderPage";

const soldOutTart: CartItem = {
  id: 5,
  name: "Lemon Tart",
  price: 5,
  quantity: 1,
  image: "",
  available: false,
};

const availableBrownie: CartItem = {
  id: 6,
  name: "Chocolate Brownie",
  price: 4.5,
  quantity: 2,
  image: "/brownie.jpg",
  available: true,
};

function renderCart(cartItems: CartItem[], restaurantId = "demo-restaurant") {
  return renderToStaticMarkup(createElement(PlaceOrderPage, {
    cartItems,
    restaurantId,
    onCartChange: () => {},
    onBack: () => {},
    onBackToRestaurants: () => {},
  }));
}

describe("place order eligibility", () => {
  it("disables Place Order and explains when every selected item is sold out", () => {
    const html = renderCart([soldOutTart]);

    expect(html).toContain("All selected items are sold out.");
    expect(html).toContain('<button type="button" class="interactive-button" disabled=""');
    expect(html).toContain("Place Order");
  });

  it("blocks checkout when multiple selected items are all sold out", () => {
    const anotherSoldOutItem: CartItem = {
      id: 7,
      name: "Raspberry Macaron",
      price: 3,
      quantity: 3,
      image: "",
      available: false,
    };
    const html = renderCart([soldOutTart, anotherSoldOutItem]);

    expect(html).toContain("Lemon Tart");
    expect(html).toContain("Raspberry Macaron");
    expect(html).toContain("All selected items are sold out.");
    expect(html).toContain('<p role="status">');
    expect(html).toContain("cursor:not-allowed");
  });

  it("does not claim the entire cart is sold out when any selected item is available", () => {
    const html = renderCart([soldOutTart, availableBrownie]);

    expect(html).toContain("Lemon Tart");
    expect(html).toContain("Chocolate Brownie");
    expect(html).not.toContain("All selected items are sold out.");
    expect(html).toContain("Updating your fare…");
    expect(html).toContain('<button type="button" class="interactive-button" disabled=""');
  });

  it("does not block a cart containing only available items with a sold-out warning", () => {
    const html = renderCart([availableBrownie]);

    expect(html).toContain("Chocolate Brownie");
    expect(html).toContain("Ordering from Restaurant");
    expect(html).not.toContain("All selected items are sold out.");
    expect(html).toContain("Updating your fare…");
    expect(html).toContain('<button type="button" class="interactive-button" disabled=""');
  });

  it("shows a simple empty cart without checkout controls", () => {
    const html = renderCart([]);

    expect(html).toContain("Your cart is empty.");
    expect(html).not.toContain("All selected items are sold out.");
    expect(html).not.toContain("Updating your fare…");
    expect(html).not.toContain("Place Order");
    expect(html).not.toContain('aria-label="Order summary"');
    expect(html).toContain("<svg");
  });

  it("renders cart quantities, item prices, and a known restaurant name", () => {
    const html = renderCart([availableBrownie], "1");

    expect(html).toContain("Ordering from Sweet Dreams");
    expect(html).toContain("Chocolate Brownie");
    expect(html).toMatch(/<\/button><span[^>]*>2<\/span><button/);
    expect(html).toContain("$9.00");
    expect(html).toContain("Items in your cart");
    expect(html).toContain("Order summary");
  });

  it("omits the back-to-menu link while preserving a populated cart", () => {
    const html = renderCart([soldOutTart], "2");

    expect(html).not.toContain("← Back to menu");
    expect(html).toContain("Ordering from Chocolate Heaven");
    expect(html).toContain("Place Order");
    expect(html).toContain("disabled=\"\"");
  });
});
