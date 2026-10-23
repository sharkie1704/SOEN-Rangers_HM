import { Role } from "../Role";
import { isCommonCommand, type PermissionCommand, type PermissionUser, type RolePermissions } from "./RolePermissions";

export class RestaurantPermission implements RolePermissions {
  canExecute(cmd: PermissionCommand, user: PermissionUser): boolean {
    if (user.role !== Role.RESTAURANT || !user.id?.trim()) return false;
    if (isCommonCommand(cmd)) return true;
    switch (cmd.name) {
      case "viewOrder":
      case "manageOrders":
      case "manageMenu":
      case "changeRestaurantStatus":
        return !!user.restaurantId?.trim() && cmd.restaurantId === user.restaurantId;
      default: return false;
    }
  }
}
