import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DashboardOutputConsole, {
  formatOutputEvent,
  getOutputEntryType,
  getOutputPage,
  OUTPUT_CONSOLE_PAGE_SIZE,
} from "./DashboardOutputConsole";

describe("dashboard output console", () => {
  it("shows a structured activity table with a waiting state", () => {
    const html = renderToStaticMarkup(createElement(DashboardOutputConsole));

    expect(html).toContain('aria-label="Dashboard output console"');
    expect(html).toContain("Output Console");
    expect(html).toContain("Waiting for system activity.");
    expect(html).toContain("<th scope=\"col\">Time</th>");
    expect(html).toContain("<th scope=\"col\">Type</th>");
    expect(html).toContain("<th scope=\"col\">Command</th>");
    expect(html).toContain("<th scope=\"col\">Outcome</th>");
  });

  it("uses distinct types for commands and requests", () => {
    expect(getOutputEntryType({ command: "POST /api/orders", failed: false })).toBe("Command");
    expect(getOutputEntryType({ command: "GET /api/orders/all", failed: false })).toBe("Request");
    expect(getOutputEntryType({ command: "POST /api/orders", failed: true })).toBe("Error");
  });

  it("limits each console page to 20 entries", () => {
    const entries = Array.from({ length: 45 }, (_, index) => index);

    expect(OUTPUT_CONSOLE_PAGE_SIZE).toBe(20);
    expect(getOutputPage(entries, 1)).toEqual(entries.slice(0, 20));
    expect(getOutputPage(entries, 2)).toEqual(entries.slice(20, 40));
    expect(getOutputPage(entries, 3)).toEqual(entries.slice(40));
  });

  it("describes successful order placement and delivery concisely", () => {
    const placed = formatOutputEvent({
      method: "POST",
      path: "/api/orders",
      status: 201,
      timestamp: "2026-11-09T12:00:00.000Z",
    });
    const delivered = formatOutputEvent({
      method: "POST",
      path: "/api/orders/42/deliver",
      status: 200,
      timestamp: "2026-11-09T12:00:00.000Z",
    });

    expect(placed.outcome).toBe("Order placed successfully.");
    expect(delivered.outcome).toBe("Order #42 delivered successfully.");
    expect(placed.command).toBe("POST /api/orders");
    expect(delivered.command).toBe("POST /api/orders/42/deliver");
    expect(placed.failed).toBe(false);
    expect(delivered.failed).toBe(false);
  });

  it("reports validation and other command errors", () => {
    const validation = formatOutputEvent({
      method: "POST",
      path: "/api/orders/quote",
      status: 400,
      timestamp: "2026-11-09T12:00:00.000Z",
    });
    const forbidden = formatOutputEvent({
      method: "POST",
      path: "/api/orders/42/deliver",
      status: 403,
      timestamp: "2026-11-09T12:00:00.000Z",
    });

    expect(validation.outcome).toBe("Validation error");
    expect(forbidden.outcome).toBe("Permission denied");
    expect(validation.status).toBe(400);
    expect(forbidden.status).toBe(403);
    expect(validation.failed).toBe(true);
    expect(forbidden.failed).toBe(true);
  });

  it("reports conflict, server, and transport failures", () => {
    const conflict = formatOutputEvent({
      method: "POST",
      path: "/api/orders/42/deliver",
      status: 409,
      timestamp: "2026-11-09T12:00:00.000Z",
    });
    const server = formatOutputEvent({
      method: "POST",
      path: "/api/orders",
      status: 500,
      timestamp: "2026-11-09T12:00:00.000Z",
    });
    const network = formatOutputEvent({
      method: "POST",
      path: "/api/orders",
      status: 0,
      timestamp: "2026-11-09T12:00:00.000Z",
    });

    expect(conflict.outcome).toBe("Command rejected");
    expect(server.outcome).toBe("System error");
    expect(network.outcome).toBe("Connection error");
    expect(conflict.failed).toBe(true);
    expect(server.failed).toBe(true);
    expect(network.failed).toBe(true);
  });

  it("reports commands that fail before reaching the server", () => {
    const failed = formatOutputEvent({
      method: "POST",
      path: "/api/orders",
      status: 0,
      timestamp: "2026-11-09T12:00:00.000Z",
    });

    expect(failed.outcome).toBe("Connection error");
    expect(failed.command).toBe("POST /api/orders");
    expect(failed.failed).toBe(true);
  });

  it("shows locally executed demo handoffs without misreporting them as backend actions", () => {
    const localDelivery = formatOutputEvent({
      method: "LOCAL",
      path: "/demo/orders/1042/deliver",
      status: 200,
      timestamp: "2026-11-09T12:00:00.000Z",
      outcome: "Demo order #1042 marked delivered locally.",
    });

    expect(localDelivery.command).toBe("LOCAL /demo/orders/1042/deliver");
    expect(localDelivery.outcome).toBe("Demo order #1042 marked delivered locally.");
    expect(localDelivery.failed).toBe(false);
  });
});
