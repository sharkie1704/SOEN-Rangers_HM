import { User } from "../../domain/reg/User";
import { Customer } from "../../domain/reg/Customer";
import { Staff } from "../../domain/reg/Staff";

export function toUserDto(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ...(user instanceof Staff ? { restaurantId: user.restaurantId } : {}),
    ...(user instanceof Customer ? { address: user.address } : {}),
  };
}