import { MenuItem, type MenuItemProps } from "../../domain/ord/MenuItem.ts";
import { OrderError, requireId } from "../../domain/ord/OrderError.ts";
import { Role } from "../../domain/reg/Role.ts";
import type { OrderActor } from "./OrderActor.ts";
import type { MenuItemEvent, MenuRepository } from "./MenuRepository.ts";

type RestaurantActor = Extract<OrderActor, { role: Role.RESTAURANT }>;

export class MenuService {
  private readonly repository: MenuRepository;

  constructor(repository: MenuRepository) {
    this.repository = repository;
  }

  async list(actor: OrderActor | null, restaurantId: string): Promise<readonly MenuItem[]> {
    this.requireOwner(actor, restaurantId);
    return this.repository.findByRestaurant(restaurantId);
  }

  async add(actor: OrderActor | null, input: Omit<MenuItemProps, "id">): Promise<MenuItem> {
    this.requireOwner(actor, input.restaurantId);
    // Build once with a placeholder id so the domain validates name/price before anything is stored
    new MenuItem({ ...input, id: 1 });
    return this.repository.add(input);
  }

  async update(actor: OrderActor | null, menuItemId: number, changes: { name?: string; priceCents?: number }): Promise<MenuItem> {
    const item = await this.ownedItem(actor, menuItemId);
    if (changes.name !== undefined) item.rename(changes.name);
    if (changes.priceCents !== undefined) item.changePrice(changes.priceCents);
    await this.repository.save(item);
    return item;
  }

  async remove(actor: OrderActor | null, menuItemId: number): Promise<void> {
    await this.ownedItem(actor, menuItemId);
    await this.repository.remove(menuItemId);
  }

  async setAvailable(actor: OrderActor | null, menuItemId: number, available: boolean): Promise<{ item: MenuItem; eventId: number }> {
    const item = await this.ownedItem(actor, menuItemId);
    const owner = this.requireOwner(actor, item.restaurantId);

    if (!item.setAvailable(available)) {
      throw new OrderError("CONFLICT", `Item is already ${available ? "available" : "sold out"}.`);
    }

    const eventId = await this.repository.nextEventId();
    await this.repository.save(item);
    const event: MenuItemEvent = {
      eventId,
      menuItemId: item.id,
      actorId: owner.userId,
      available,
      occurredAt: new Date(),
    };
    await this.repository.recordEvent(event);
    return { item, eventId };
  }

  private requireOwner(actor: OrderActor | null, restaurantId: string): RestaurantActor {
    if (!actor || actor.role !== Role.RESTAURANT || actor.restaurantId !== restaurantId) {
      throw new OrderError("FORBIDDEN", "Restaurant accounts can only manage their own restaurant's menu.");
    }
    return actor;
  }

  private async ownedItem(actor: OrderActor | null, menuItemId: number): Promise<MenuItem> {
    const item = await this.repository.findById(requireId(menuItemId, "Menu item ID"));
    if (!item) {
      throw new OrderError("NOT_FOUND", "Menu item was not found.");
    }
    this.requireOwner(actor, item.restaurantId);
    return item;
  }
}