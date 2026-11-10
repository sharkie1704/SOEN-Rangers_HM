import { beforeEach, describe, expect, it, vi } from "vitest";
import { Order } from "../../../domain/ord/Order.ts";
import type { OrderStatus, StateChangeEvent } from "../../../domain/ord/StateChangeEvent.ts";

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    orderEvent: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    order: {
      updateMany: vi.fn(),
    },
    ledgerEntry: {
      create: vi.fn(),
    },
  };
  return {
    tx,
    prisma: {
      $transaction: vi.fn((work: (client: typeof tx) => Promise<void>) => work(tx)),
    },
  };
});

vi.mock("../../db/PrismaClient.ts", () => ({ prisma: mocks.prisma }));

import { PrismaOrderRepository } from "../PrismaOrderRepository.ts";

function terminalOrder(status: Extract<OrderStatus, "Delivered" | "Refunded" | "Rejected" | "Cancelled">) {
  const event: StateChangeEvent = {
    eventId: 50,
    orderId: 8,
    actorId: "actor-1",
    action: status === "Delivered" ? "deliver" : status === "Refunded" ? "refund" : status === "Rejected" ? "reject" : "cancel",
    from: status === "Delivered" ? "PickedUp" : status === "Refunded" ? "Delivered" : "Placed",
    to: status,
    occurredAt: new Date("2026-11-07T10:30:00Z"),
  };
  const order = Order.restore({
    id: 8,
    restaurantId: "restaurant-1",
    restaurantName: "Demo Bakery",
    customerId: "customer-1",
    lines: [{ menuItemId: 7, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
    fare: {
      subtotalCents: 450,
      deliveryFeeCents: 300,
      serviceFeeCents: 150,
      smallOrderSurchargeCents: 200,
      totalCents: 1100,
    },
    placedAt: new Date("2026-11-07T10:00:00Z"),
    status,
    events: [event],
  });
  return { order, event };
}

describe("PrismaOrderRepository terminal event persistence", () => {
  beforeEach(() => {
    mocks.tx.$queryRaw.mockResolvedValue([{ epoch: 3 }]);
    mocks.tx.orderEvent.findMany.mockResolvedValue([]);
    mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.orderEvent.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.ledgerEntry.create.mockReset();
  });

  it.each(["Delivered", "Refunded", "Rejected", "Cancelled"] as const)("writes one immutable ledger row for %s", async (status) => {
    const { order, event } = terminalOrder(status);

    await new PrismaOrderRepository().save(order);

    expect(mocks.tx.ledgerEntry.create).toHaveBeenCalledTimes(1);
    expect(mocks.tx.ledgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: event.eventId,
        orderId: order.id,
        finalState: status.toUpperCase(),
        epoch: 3,
        finalizedAt: event.occurredAt,
        totalChargeCents: status === "Delivered" ? 1100 : 0,
      }),
    });
  });

  it("does not append a second ledger row when an already-persisted event is saved again", async () => {
    const { order } = terminalOrder("Delivered");
    mocks.tx.orderEvent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 50 }]);

    await new PrismaOrderRepository().save(order);
    await new PrismaOrderRepository().save(order);

    expect(mocks.tx.ledgerEntry.create).toHaveBeenCalledTimes(1);
  });

  it("does not write a ledger row for non-terminal order events", async () => {
    const event: StateChangeEvent = {
      eventId: 51,
      orderId: 8,
      actorId: "actor-1",
      action: "accept",
      from: "Placed",
      to: "Accepted",
      occurredAt: new Date("2026-11-07T10:05:00Z"),
    };
    const order = Order.restore({
      id: 8,
      restaurantId: "restaurant-1",
      customerId: "customer-1",
      lines: [{ menuItemId: 7, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
      placedAt: new Date("2026-11-07T10:00:00Z"),
      status: "Accepted",
      events: [event],
    });

    await new PrismaOrderRepository().save(order);

    expect(mocks.tx.ledgerEntry.create).not.toHaveBeenCalled();
  });
});
