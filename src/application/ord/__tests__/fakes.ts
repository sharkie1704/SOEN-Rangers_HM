import type { Order } from "../../../domain/ord/Order.ts";
import { PreparationQueue } from "../../../domain/ord/PreparationQueue.ts";
import type { OrderRepository } from "../OrderRepository.ts";
import type { CatalogMenuItem, CatalogRestaurant, MenuCatalog } from "../MenuCatalog.ts";

export class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<number, Order>();
  private queues = new Map<string, PreparationQueue>();
  private orderSeq = 0;
  private eventSeq = 0;

  nextOrderId(): number { return ++this.orderSeq; }
  nextEventId(): number { return ++this.eventSeq; }
  add(order: Order): void { this.orders.set(order.id, order); }
  findById(orderId: number): Order | undefined { return this.orders.get(orderId); }

  findByRestaurant(restaurantId: string): readonly Order[] {
    return [...this.orders.values()].filter((o) => o.restaurantId === restaurantId);
  }

  getPreparationQueue(restaurantId: string): PreparationQueue {
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

  findRestaurant(restaurantId: string): CatalogRestaurant | undefined { return this.restaurants.get(restaurantId); }
  findMenuItem(menuItemId: number): CatalogMenuItem | undefined { return this.items.get(menuItemId); }
}
