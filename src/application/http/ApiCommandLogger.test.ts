import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { apiCommandLogger } from "./ApiCommandLogger";
import { subscribeToOutputEvents } from "./CommandEvents";

function runLogger(method: string, path: string, statusCode: number) {
  let finish: (() => void) | undefined;
  const request = { method, originalUrl: `${path}?safe=false`, path } as Request;
  const response = {
    statusCode,
    on: (_event: string, listener: () => void) => {
      finish = listener;
      return response;
    },
  } as unknown as Response;

  apiCommandLogger(request, response, vi.fn());
  finish?.();
}

describe("API command logger output", () => {
  it("publishes successful read requests and commands without query strings", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToOutputEvents(listener);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});

    runLogger("POST", "/api/orders", 201);
    runLogger("GET", "/api/orders", 200);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, expect.objectContaining({
      method: "POST",
      path: "/api/orders",
      status: 201,
    }));
    expect(listener).toHaveBeenNthCalledWith(2, expect.objectContaining({
      method: "GET",
      path: "/api/orders",
      status: 200,
    }));
    expect(log).toHaveBeenCalledWith("[API] POST /api/orders -> 201");
    unsubscribe();
    log.mockRestore();
  });

  it("publishes successful POST, PUT, PATCH, and DELETE commands", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToOutputEvents(listener);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) runLogger(method, "/api/test", 204);

    expect(listener).toHaveBeenCalledTimes(4);
    expect(listener.mock.calls.map(([event]) => event.method)).toEqual(["POST", "PUT", "PATCH", "DELETE"]);
    unsubscribe();
    log.mockRestore();
  });

  it("publishes failures for read requests as well as failed commands", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToOutputEvents(listener);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});

    runLogger("GET", "/api/orders", 403);
    runLogger("POST", "/api/orders", 400);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, expect.objectContaining({
      method: "GET",
      path: "/api/orders",
      status: 403,
    }));
    expect(listener).toHaveBeenNthCalledWith(2, expect.objectContaining({
      method: "POST",
      path: "/api/orders",
      status: 400,
    }));
    unsubscribe();
    log.mockRestore();
  });

  it("does not turn the event-stream connection itself into a log entry", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToOutputEvents(listener);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});

    runLogger("GET", "/api/command-events", 200);

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
    log.mockRestore();
  });
});
