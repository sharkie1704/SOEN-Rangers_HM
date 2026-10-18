// Clients only choose items; name and price are looked up from the menu
export interface PlaceOrderLineDTO {
  menuItemId: number;
  quantity: number;
}

export interface PlaceOrderDTO {
  restaurantId: string;
  lines: readonly PlaceOrderLineDTO[];
}
