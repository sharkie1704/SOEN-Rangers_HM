import type { Order } from "../../../domain/ord/Order.ts";
import { PreparationQueue } from "../../../domain/ord/PreparationQueue.ts";
import type { OrderRepository } from "../OrderRepository.ts";
import type { CatalogMenuItem, CatalogRestaurant, MenuCatalog } from "../MenuCatalog.ts";
import { MenuItem, type MenuItemProps } from "../../../domain/ord/MenuItem.ts";
import type { MenuItemEvent, MenuRepository } from "../MenuRepository.ts";
import { Restaurant, type RestaurantStatus } from "../../../domain/ord/Restaurant.ts";
import type { RestaurantStatusEvent, RestaurantStatusRepository } from "../RestaurantStatusRepository.ts";

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

  async findByCustomer(customerId: string): Promise<readonly Order[]> {
    return [...this.orders.values()].filter((o) => o.customerId === customerId);
  }

  async withQueueLock<T>(_restaurantId: string, work: (orders: OrderRepository) => Promise<T>): Promise<T> {
    return work(this);
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

export class InMemoryMenuRepository implements MenuRepository {
  items = new Map<number, MenuItem>();
  events: MenuItemEvent[] = [];
  private itemSeq = 0;
  private eventSeq = 0;

  async nextEventId(): Promise<number> { return ++this.eventSeq; }

  async add(item: Omit<MenuItemProps, "id">): Promise<MenuItem> {
    const created = new MenuItem({ ...item, id: ++this.itemSeq });
    this.items.set(created.id, created);
    return created;
  }

  async save(): Promise<void> {}
  async remove(menuItemId: number): Promise<void> { this.items.delete(menuItemId); }
  async findById(menuItemId: number): Promise<MenuItem | undefined> { return this.items.get(menuItemId); }

  async findByRestaurant(restaurantId: string): Promise<readonly MenuItem[]> {
    return [...this.items.values()].filter((i) => i.restaurantId === restaurantId);
  }

  async recordEvent(event: MenuItemEvent): Promise<void> { this.events.push(event); }
}

export class InMemoryRestaurantStatusRepository implements RestaurantStatusRepository {
  restaurants = new Map<string, Restaurant>();
  events: RestaurantStatusEvent[] = [];
  private eventSeq = 0;

  withRestaurant(id: string, status: RestaurantStatus = "OPEN"): this {
    this.restaurants.set(id, new Restaurant(id, status));
    return this;
  }

  async nextEventId(): Promise<number> { return ++this.eventSeq; }
  async findById(restaurantId: string): Promise<Restaurant | undefined> { return this.restaurants.get(restaurantId); }
  async save(_restaurant: Restaurant, event: RestaurantStatusEvent): Promise<void> { this.events.push(event); }
}
