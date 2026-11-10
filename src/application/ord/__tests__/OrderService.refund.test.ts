import { describe, expect, it } from "vitest";
import { Order } from "../../../domain/ord/Order.ts";
import { Role } from "../../../domain/reg/Role.ts";
import type { OrderActor } from "../OrderActor.ts";
import { OrderService } from "../OrderService.ts";
import { FakeMenuCatalog, InMemoryOrderRepository } from "./fakes.ts";

const operator: OrderActor = { userId: "operator-1", role: Role.OPERATOR };
const customer: OrderActor = { userId: "customer-1", role: Role.CUSTOMER };

function deliveredOrder(): Order {
  return Order.restore({
    id: 42,
    restaurantId: "restaurant-1",
    customerId: "customer-1",
    lines: [{ menuItemId: 1, name: "Brownie", quantity: 1, unitPriceCents: 450 }],
    placedAt: new Date("2026-11-04T12:00:00Z"),
    status: "Delivered",
    events: [],
  });
}

async function serviceWithDeliveredOrder() {
  const repository = new InMemoryOrderRepository();
  const order = deliveredOrder();
  await repository.add(order);
  return { repository, order, service: new OrderService(repository, new FakeMenuCatalog()) };
}

describe("OrderService.refund", () => {
  it("allows an operator to refund a delivered order", async () => {
    const { order, service } = await serviceWithDeliveredOrder();

    const result = await service.refund(operator, order.id);

    expect(result.order.status).toBe("Refunded");
    expect(result.event).toMatchObject({
      action: "refund",
      from: "Delivered",
      to: "Refunded",
      actorId: "operator-1",
    });
  });

  it("rejects non-operator refund attempts", async () => {
    const { service, order } = await serviceWithDeliveredOrder();

    await expect(service.refund(customer, order.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not allow a refund to be applied twice", async () => {
    const { service, order } = await serviceWithDeliveredOrder();

    await service.refund(operator, order.id);
    await expect(service.refund(operator, order.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });
});
