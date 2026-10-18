import { OrderError, requireId, requireText } from "./OrderError.ts";
import type { OrderLineDTO } from "./OrderLineDTO.ts";

export class OrderLine {
  readonly menuItemId: number;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;

  constructor(input: OrderLineDTO) {
    this.menuItemId = requireId(input.menuItemId, "Menu item ID");
    this.name = requireText(input.name, "Item name");
    if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
      throw new OrderError("INVALID_INPUT", "Quantity must be a positive integer.");
    }
    if (!Number.isSafeInteger(input.unitPriceCents) || input.unitPriceCents < 0) {
      throw new OrderError("INVALID_INPUT", "Price must be a non-negative integer in cents.");
    }
    if (!Number.isSafeInteger(input.quantity * input.unitPriceCents)) {
      throw new OrderError("INVALID_INPUT", "Line total exceeds the supported amount.");
    }
    this.quantity = input.quantity;
    this.unitPriceCents = input.unitPriceCents;
    Object.freeze(this);
  }

  get totalCents(): number {
    return this.quantity * this.unitPriceCents;
  }
}
