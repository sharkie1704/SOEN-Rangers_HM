import type { Order } from "../../../domain/ord/Order.ts";
import { PreparationQueue } from "../../../domain/ord/PreparationQueue.ts";
import type { OrderRepository } from "../OrderRepository.ts";
import type { CatalogMenuItem, CatalogRestaurant, MenuCatalog } from "../MenuCatalog.ts";

// Keeps live Order instances, so save() has nothing to do
export class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<number, Order>();
  private queues = new Map<string, PreparationQueue>();
  private orderSeq = 0;
  private eventSeq = 0;

  async nextOrderId(): Promise<number> { return ++this.orderSeq; }
  async nextEventId(): Promise<number> { return ++this.eventSeq; }
  async add(order: Order): Promise<void> { this.orders.set(order.id, order); }
  async save(): Promise<void> {}
  async findById(orderId: number): Promise<Order | undefined> { return this.orders.get(orderId); }

  async findByRestaurant(restaurantId: string): Promise<readonly Order[]> {
    return [...this.orders.values()].filter((o) => o.restaurantId === restaurantId);
  }

  async getPreparationQueue(restaurantId: string): Promise<PreparationQueue> {
    let queue = this.queues.get(restaurantId);
    if (!queue) {
      queue = new PreparationQueue(restaurantId);
      this.queues.set(restaurantId, queue);
    }
    return queue;
  }
}

export class FakeMenuCatalog implements MenuCatalog {
  restaurants = new Map<string, CatalogRestaurant>();
  items = new Map<number, CatalogMenuItem>();

  addRestaurant(restaurantId: string, isOpen = true): this {
    this.restaurants.set(restaurantId, { restaurantId, isOpen });
    return this;
  }

  addItem(item: Omit<CatalogMenuItem, "available"> & { available?: boolean }): this {
    this.items.set(item.menuItemId, { available: true, ...item });
    return this;
  }

  async findRestaurant(restaurantId: string): Promise<CatalogRestaurant | undefined> { return this.restaurants.get(restaurantId); }
  async findMenuItem(menuItemId: number): Promise<CatalogMenuItem | undefined> { return this.items.get(menuItemId); }
}
