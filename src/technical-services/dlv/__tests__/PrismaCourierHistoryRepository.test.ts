import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("../../db/PrismaClient.ts", () => ({ prisma: { assignment: { findMany } } }));
import { PrismaCourierHistoryRepository } from "../PrismaCourierHistoryRepository.ts";

const placedAt = new Date("2026-11-01T10:00:00Z");
const deliveredAt = new Date("2026-11-01T11:00:00Z");
function assignment(id: number, summary: object | null = null) {
  return {
    events: [{ occurredAt: deliveredAt }],
    order: {
      id, restaurantId: "bakery", restaurantName: null,
      restaurant: { name: "Bakery" }, placedAt,
      lines: [{ name: "Brownie", quantity: 2, unitPriceCents: 450 }],
      summary, events: [] as { occurredAt: Date }[], fareTotalCents: 1550,
    },
  };
}

beforeEach(() => findMany.mockReset());
describe("courier history persistence query", () => {
  it("includes completed deliveries with and without summaries without exposing or reconstructing prices", async () => {
    const generatedAt = new Date("2026-11-01T11:01:00Z");
    findMany.mockResolvedValue([
      assignment(10),
      assignment(11, { deliveredAt, generatedAt, restaurantName: "Saved Bakery", totalCents: 1550 }),
    ]);
    const records = await new PrismaCourierHistoryRepository().findCompleted("courier-a");
    expect(records.map((entry) => entry.orderId)).toEqual([11, 10]);
    expect(records[0]).toMatchObject({ restaurantName: "Saved Bakery", deliveredAt, generatedAt });
    expect(records[1]).toMatchObject({ restaurantName: "Bakery", deliveredAt, generatedAt: null });
    for (const record of records) {
      expect(record.lines).toEqual([{ name: "Brownie", quantity: 2 }]);
      expect(record).not.toHaveProperty("fare");
      expect(record).not.toHaveProperty("totalChargeCents");
    }
    expect(findMany.mock.calls[0][0].where).toEqual({
      courierId: "courier-a", status: "COMPLETED",
      order: { status: { in: ["DELIVERED", "REFUNDED"] } },
    });
    expect(findMany.mock.calls[0][0].include.order.include.events.where)
      .toEqual({ action: "DELIVER", actorId: "courier-a" });
  });

  it("uses a saved delivery event and leaves unknown timestamps null", async () => {
    const withEvent = assignment(12);
    withEvent.order.events = [{ occurredAt: deliveredAt }];
    const missing = assignment(13);
    missing.events = [];
    findMany.mockResolvedValue([withEvent, missing]);
    const records = await new PrismaCourierHistoryRepository().findCompleted("courier-a");
    expect(records.find((entry) => entry.orderId === 12)?.deliveredAt).toEqual(deliveredAt);
    expect(records.find((entry) => entry.orderId === 13)?.deliveredAt).toBeNull();
  });
});
