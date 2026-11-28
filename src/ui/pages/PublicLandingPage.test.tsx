import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { useApi } from "../reg/api/useApi";
import PublicLandingPage from "./PublicLandingPage";

vi.mock("../reg/api/useApi", () => ({ useApi: vi.fn() }));

it("shows static dessert categories and sends browsing links to login", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <PublicLandingPage />
    </MemoryRouter>,
  );

  expect(html).toMatch(/class="public-hero__action" href="\/login"[^>]*>Find desserts/);
  const categoryLinks = [...html.matchAll(/class="public-category" href="([^"]+)"[^>]*>.*?<span>([^<]+)<\/span><\/a>/g)];
  expect(categoryLinks.map(([, href, name]) => [name, href])).toEqual(
    ["Waffles", "Cakes", "Ice cream", "Cookies", "Brownies", "Macarons"].map((name) => [name, "/login"]),
  );
  expect(html).not.toContain("Discover local dessert spots");
  expect(html).not.toContain("<footer");
  expect(useApi).not.toHaveBeenCalled();
});
