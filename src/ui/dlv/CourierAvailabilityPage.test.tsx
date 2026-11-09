import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CourierAvailabilityPage from "./CourierAvailabilityPage";

describe("courier availability page", () => {
  it("shows a clear, accessible loading state while checking courier status", () => {
    const html = renderToStaticMarkup(createElement(CourierAvailabilityPage));

    expect(html).toContain('aria-label="Courier availability"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("YOUR WORK STATUS");
    expect(html).toContain("<h1>Availability</h1>");
    expect(html).not.toContain("Choose when you’re ready to receive delivery offers.");
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).toContain("Checking your availability…");
  });
});
