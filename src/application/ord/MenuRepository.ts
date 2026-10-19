import type { MenuItem, MenuItemProps } from "../../domain/ord/MenuItem.ts";

export interface MenuItemEvent {
  readonly eventId: number;
  readonly menuItemId: number;
  readonly actorId: string;
  readonly available: boolean;
  readonly occurredAt: Date;
}

export interface MenuRepository {
  nextEventId(): Promise<number>;

  add(item: Omit<MenuItemProps, "id">): Promise<MenuItem>;
  save(item: MenuItem): Promise<void>;
  remove(menuItemId: number): Promise<void>;
  findById(menuItemId: number): Promise<MenuItem | undefined>;
  findByRestaurant(restaurantId: string): Promise<readonly MenuItem[]>;
  recordEvent(event: MenuItemEvent): Promise<void>;
}