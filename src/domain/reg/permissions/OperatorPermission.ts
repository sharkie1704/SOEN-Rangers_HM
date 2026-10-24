import { Role } from "../Role";
import { isCommonCommand, type PermissionCommand, type PermissionUser, type RolePermissions } from "./RolePermissions";

export class OperatorPermission implements RolePermissions {
  canExecute(cmd: PermissionCommand, user: PermissionUser): boolean {
    if (user.role !== Role.OPERATOR || !user.id?.trim()) return false;
    return isCommonCommand(cmd) || cmd.name === "createOperator" || cmd.name === "changeRestaurantStatus";
  }
}
