import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OperatorDispatchQueuePage from "./OperatorDispatchQueuePage";

describe("operator dispatch queue page", () => {
  it("renders a separate dispatch view with a loading state and refresh action", () => {
    const html = renderToStaticMarkup(createElement(OperatorDispatchQueuePage));

    expect(html).toContain("Dispatch Queue");
    expect(html).toContain("Loading dispatch queue…");
    expect(html).toContain("Refresh queue");
    expect(html).not.toContain("All Orders");
  });
});
