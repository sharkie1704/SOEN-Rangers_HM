import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  states: [] as unknown[],
  index: 0,
  effects: [] as (() => unknown)[],
}));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = harness.index++;
    if (!(index in harness.states)) harness.states[index] = initial;
    return [harness.states[index], (value: unknown) => { harness.states[index] = value; }];
  },
  useEffect: (effect: () => unknown) => { harness.effects.push(effect); },
}));

import { ApiError } from "./client";
import { errorMessage, useApi } from "./useApi";

function render<T>(load: () => Promise<T>) {
  harness.index = 0;
  harness.effects = [];
  return useApi(load, "Could not load.");
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  harness.states = [];
});

describe("useApi", () => {
  it("starts loading with no data and no error", () => {
    const resource = render(() => Promise.resolve(1));

    expect(resource).toMatchObject({ data: undefined, loading: true, error: "" });
  });

  it("stores the loaded data and stops loading", async () => {
    render(() => Promise.resolve({ orders: [1, 2] }));
    harness.effects[0]();
    await settle();

    expect(render(() => Promise.resolve(null))).toMatchObject({ data: { orders: [1, 2] }, loading: false, error: "" });
  });

  it("shows the server's message for an API error", async () => {
    render(() => Promise.reject(new ApiError(403, "Only operators can view this.")));
    harness.effects[0]();
    await settle();

    expect(render(() => Promise.resolve(null))).toMatchObject({ loading: false, error: "Only operators can view this." });
  });

  it("shows the fallback message for any other failure", async () => {
    render(() => Promise.reject(new TypeError("Failed to fetch")));
    harness.effects[0]();
    await settle();

    expect(render(() => Promise.resolve(null)).error).toBe("Could not load.");
  });

  it("ignores a response that arrives after the effect is cleaned up", async () => {
    render(() => Promise.resolve("late"));
    const cleanup = harness.effects[0]() as () => void;
    cleanup();
    await settle();

    expect(render(() => Promise.resolve(null))).toMatchObject({ data: undefined, loading: true });
  });

  it("clears the previous error when it loads again", async () => {
    render(() => Promise.reject(new Error("down")));
    harness.effects[0]();
    await settle();

    render(() => Promise.resolve("back")).reload();
    harness.effects = [];
    render(() => Promise.resolve("back"));
    harness.effects[0]();

    expect(render(() => Promise.resolve(null))).toMatchObject({ error: "", loading: true });
    await settle();
    expect(render(() => Promise.resolve(null))).toMatchObject({ data: "back", loading: false });
  });
});

describe("errorMessage", () => {
  it("uses the API error's message", () => {
    expect(errorMessage(new ApiError(409, "Order changed."), "Fallback")).toBe("Order changed.");
  });

  it("uses the fallback for a server failure", () => {
    expect(errorMessage(new ApiError(500, "Request failed"), "Fallback")).toBe("Fallback");
  });

  it("uses the fallback for other errors", () => {
    expect(errorMessage(new Error("boom"), "Fallback")).toBe("Fallback");
  });
});
