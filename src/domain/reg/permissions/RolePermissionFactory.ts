import { Role } from "../Role";
import type { RolePermissions } from "./RolePermissions";
import { CustomerPermission } from "./CustomerPermission";
import { RestaurantPermission } from "./RestaurantPermission";
import { CourierPermission } from "./CourierPermission";
import { OperatorPermission } from "./OperatorPermission";

const denyAll: RolePermissions = Object.freeze({ canExecute: () => false });

export class RolePermissionFactory {
  getPermissions(role: Role): RolePermissions {
    switch (role) {
      case Role.CUSTOMER: return new CustomerPermission();
      case Role.RESTAURANT: return new RestaurantPermission();
      case Role.COURIER: return new CourierPermission();
      case Role.OPERATOR: return new OperatorPermission();
      default: return denyAll;
    }
  }
}
