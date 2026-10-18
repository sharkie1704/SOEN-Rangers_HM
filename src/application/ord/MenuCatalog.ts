export interface CatalogRestaurant {
  readonly restaurantId: string;
  readonly isOpen: boolean;
}

export interface CatalogMenuItem {
  readonly menuItemId: number;
  readonly restaurantId: string;
  readonly name: string;
  readonly unitPriceCents: number;
  readonly available: boolean;
}

// Read-only view of restaurants and menus that OrderService prices orders from
export interface MenuCatalog {
  findRestaurant(restaurantId: string): CatalogRestaurant | undefined;
  findMenuItem(menuItemId: number): CatalogMenuItem | undefined;
}
