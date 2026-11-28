import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PromoCodeField from "./PromoCodeField";

describe("PromoCodeField", () => {
  it("renders a labelled, keyboard-accessible optional input", () => {
    const html = renderToStaticMarkup(createElement(PromoCodeField, {
      appliedCode: "",
      onApply: () => {},
      onRemove: () => {},
    }));
    expect(html).toContain("aria-label=\"Promo code\"");
    expect(html).toContain("<input");
    expect(html).toContain("Promo code");
    expect(html).toContain('type="submit"');
  });

  it("shows the applied code and exposes removal", () => {
    const html = renderToStaticMarkup(createElement(PromoCodeField, {
      appliedCode: "WELCOME10",
      onApply: () => {},
      onRemove: () => {},
    }));
    expect(html).toContain("WELCOME10");
    expect(html).toContain("Remove");
  });
});
