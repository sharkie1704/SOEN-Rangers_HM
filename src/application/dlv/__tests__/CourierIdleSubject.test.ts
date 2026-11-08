import { describe, expect, it, vi } from "vitest";
import { CourierIdleSubject, type CourierIdleObserver } from "../CourierIdleSubject.ts";

function recorder(): CourierIdleObserver & { heard: string[] } {
  const heard: string[] = [];
  return { heard, courierBecameIdle: async (courierId) => { heard.push(courierId); } };
}

describe("CourierIdleSubject", () => {
  it("tells every subscriber which courier became idle", async () => {
    const subject = new CourierIdleSubject();
    const first = recorder();
    const second = recorder();
    subject.subscribe(first);
    subject.subscribe(second);

    await subject.notify("courier-1");

    expect(first.heard).toEqual(["courier-1"]);
    expect(second.heard).toEqual(["courier-1"]);
  });

  it("does not register the same subscriber twice", async () => {
    const subject = new CourierIdleSubject();
    const observer = recorder();
    subject.subscribe(observer);
    subject.subscribe(observer);

    await subject.notify("courier-1");

    expect(observer.heard).toHaveLength(1);
  });

  it("stops telling a subscriber once it unsubscribes", async () => {
    const subject = new CourierIdleSubject();
    const observer = recorder();
    subject.subscribe(observer);
    subject.unsubscribe(observer);

    await subject.notify("courier-1");

    expect(observer.heard).toHaveLength(0);
  });

  it("keeps notifying the others when one subscriber fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const subject = new CourierIdleSubject();
    const after = recorder();
    subject.subscribe({ courierBecameIdle: async () => { throw new Error("boom"); } });
    subject.subscribe(after);

    await expect(subject.notify("courier-1")).resolves.toBeUndefined();
    expect(after.heard).toEqual(["courier-1"]);
  });
});
