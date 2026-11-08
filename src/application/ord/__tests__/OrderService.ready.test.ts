import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "../../../domain/reg/Role.ts";
import type { OrderActor } from "../OrderActor.ts";
import type { OrderReadyListener } from "../OrderReadyListener.ts";
import { OrderService } from "../OrderService.ts";
import { FakeMenuCatalog, FakePricingSettingsRepository, InMemoryOrderRepository } from "./fakes.ts";

const alice: OrderActor = { userId: "cust-alice", role: Role.CUSTOMER };
const staff: OrderActor = { userId: "staff-a", role: Role.RESTAURANT, restaurantId: "rest-a" };

class RecordingListener implements OrderReadyListener {
  readonly ready: number[] = [];
  constructor(private readonly orders: InMemoryOrderRepository) {}

  async orderReady(orderId: number): Promise<void> {
    // Records the status DLV would see, to check the change was saved first
    this.ready.push(orderId);
    expect((await this.orders.findById(orderId))?.status).toBe("Ready");
  }
}

let listener: RecordingListener;
let service: OrderService;

beforeEach(() => {
  const orders = new InMemoryOrderRepository();
  listener = new RecordingListener(orders);
  const menu = new FakeMenuCatalog()
    .addRestaurant("rest-a")
    .addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Macaron", unitPriceCents: 350 });
  service = new OrderService(orders, menu, new FakePricingSettingsRepository(), listener);
});

async function preparingOrder() {
  const order = await service.place(alice, { restaurantId: "rest-a", lines: [{ menuItemId: 1, quantity: 1 }] });
  await service.accept(staff, order.id);
  return order.id;
}

describe("OrderService ready listener", () => {
  it("tells the listener once an order is marked ready", async () => {
    const orderId = await preparingOrder();
    const { order } = await service.markReady(staff, orderId);
    expect(order.status).toBe("Ready");
    expect(listener.ready).toEqual([orderId]);
  });

  it("does not tell the listener about other transitions", async () => {
    const orderId = await preparingOrder();
    await service.cancel(alice, (await service.place(alice, { restaurantId: "rest-a", lines: [{ menuItemId: 1, quantity: 1 }] })).id);
    expect(listener.ready).toEqual([]);
    await service.markReady(staff, orderId);
    expect(listener.ready).toEqual([orderId]);
  });

  it("does not tell the listener when marking ready fails", async () => {
    const order = await service.place(alice, { restaurantId: "rest-a", lines: [{ menuItemId: 1, quantity: 1 }] });
    await expect(service.markReady(staff, order.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(listener.ready).toEqual([]);
  });

  it("works without a listener", async () => {
    const orders = new InMemoryOrderRepository();
    const menu = new FakeMenuCatalog()
      .addRestaurant("rest-a")
      .addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Macaron", unitPriceCents: 350 });
    const plain = new OrderService(orders, menu, new FakePricingSettingsRepository());
    const order = await plain.place(alice, { restaurantId: "rest-a", lines: [{ menuItemId: 1, quantity: 1 }] });
    await plain.accept(staff, order.id);
    expect((await plain.markReady(staff, order.id)).order.status).toBe("Ready");
  });
});
