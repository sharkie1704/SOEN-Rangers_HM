import { Role } from "./Role";
import { User, UserProps } from "./User";

export interface LatLong { lat: number; lng: number }

export class Customer extends User {
  private _address: LatLong;

  constructor(props: UserProps & { address: LatLong }) {
    super(props);
    Customer.assertValidAddress(props.address);
    this._address = props.address;
  }

  get role(): Role { return Role.CUSTOMER; }
  get address(): LatLong { return this._address; }

  updateAddress(address: LatLong): void {
    Customer.assertValidAddress(address);
    this._address = address;
  }

  private static assertValidAddress(a: LatLong): void {
    if (!a || a.lat < -90 || a.lat > 90 || a.lng < -180 || a.lng > 180) {
      throw new Error("Customer must have a valid delivery address");
    }
  }
}