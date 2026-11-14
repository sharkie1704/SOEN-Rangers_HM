import { describe, expect, it, vi } from "vitest";
import { CourierHistoryService } from "../CourierHistoryService.ts";
import { Role } from "../../../domain/reg/Role.ts";

describe("CourierHistoryService", () => {
  it("uses the authenticated courier identity for every request", async () => {
    const findCompleted = vi.fn(async (courierId: string) => [{
      orderId: courierId === "a" ? 11 : 12, restaurantId: "bakery", restaurantName: "Bakery",
      lines: [], placedAt: new Date(0), deliveredAt: null, generatedAt: null,
    }]);
    const service = new CourierHistoryService({ findCompleted });
    expect(await service.list({ userId: "a", role: Role.COURIER })).toMatchObject([{ orderId: 11 }]);
    expect(await service.list({ userId: "b", role: Role.COURIER })).toMatchObject([{ orderId: 12 }]);
    expect(findCompleted.mock.calls).toEqual([["a"], ["b"]]);
  });

  it.each([null, { userId: " ", role: Role.COURIER },
    ...[Role.CUSTOMER, Role.RESTAURANT, Role.OPERATOR].map((role) => ({ userId: "a", role })),
  ])("rejects unauthorized history access: %s", async (actor) => {
    const findCompleted = vi.fn();
    await expect(new CourierHistoryService({ findCompleted }).list(actor)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(findCompleted).not.toHaveBeenCalled();
  });
});
