import { OrderError, requireText } from "./OrderError.ts";

export interface MenuItemProps {
  id: number;
  restaurantId: string;
  name: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  available: boolean;
}

export class MenuItem {
  readonly id: number;
  readonly restaurantId: string;
  private _name: string;
  private _description: string;
  private _imageUrl: string;
  private _priceCents: number;
  private _available: boolean;

  constructor(props: MenuItemProps) {
    this.id = props.id;
    this.restaurantId = props.restaurantId;
    this._name = MenuItem.validName(props.name);
    this._description = props.description;
    this._imageUrl = props.imageUrl;
    this._priceCents = MenuItem.validPrice(props.priceCents);
    this._available = props.available;
  }

  get name() { return this._name; }
  get description() { return this._description; }
  get imageUrl() { return this._imageUrl; }
  get priceCents() { return this._priceCents; }
  get available() { return this._available; }

  rename(name: string): void {
    this._name = MenuItem.validName(name);
  }

  changePrice(priceCents: number): void {
    this._priceCents = MenuItem.validPrice(priceCents);
  }

  // True only when availability actually changed, so the service records an event only for real changes
  setAvailable(available: boolean): boolean {
    if (this._available === available) return false;
    this._available = available;
    return true;
  }

  private static validName(name: string): string {
    return requireText(name, "Item name");
  }

  private static validPrice(priceCents: number): number {
    if (!Number.isSafeInteger(priceCents) || priceCents <= 0) {
      throw new OrderError("INVALID_INPUT", "Price must be a positive whole number of cents.");
    }
    return priceCents;
  }
}