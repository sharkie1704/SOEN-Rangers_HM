import { Role } from "./Role";
import { User, UserProps } from "./User";

export class Staff extends User {
  public readonly restaurantId: string;

  constructor(props: UserProps & { restaurantId: string }) {
    super(props);
    if (!props.restaurantId.trim()) throw new Error("Restaurant staff must belong to a restaurant");
    this.restaurantId = props.restaurantId;
  }

  get role(): Role { return Role.RESTAURANT; }
}