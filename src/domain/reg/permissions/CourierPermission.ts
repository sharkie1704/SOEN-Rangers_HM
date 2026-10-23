import { Role } from "../Role";
import { isCommonCommand, type PermissionCommand, type PermissionUser, type RolePermissions } from "./RolePermissions";

export class CourierPermission implements RolePermissions {
  canExecute(cmd: PermissionCommand, user: PermissionUser): boolean {
    if (user.role !== Role.COURIER || !user.id?.trim()) return false;
    // Delivery commands are outside the implemented Phase II scope.
    return isCommonCommand(cmd);
  }
}
