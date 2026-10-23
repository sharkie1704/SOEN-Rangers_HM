import { Role } from "../Role";
import { isCommonCommand, type PermissionCommand, type PermissionUser, type RolePermissions } from "./RolePermissions";

export class CustomerPermission implements RolePermissions {
  canExecute(cmd: PermissionCommand, user: PermissionUser): boolean {
    if (user.role !== Role.CUSTOMER || !user.id?.trim()) return false;
    if (isCommonCommand(cmd)) return true;
    switch (cmd.name) {
      case "placeOrder":
      case "customerOrders": return true;
      case "viewOrder":
      case "cancelOrder": return cmd.customerId === user.id;
      default: return false;
    }
  }
}
