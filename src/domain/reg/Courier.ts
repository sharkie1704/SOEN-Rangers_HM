import { Role } from "./Role";
import { User, UserProps } from "./User";

export class Courier extends User {
  constructor(props: UserProps) { super(props); }
  get role(): Role { return Role.COURIER; }
}