import { Role } from "../Role";
import { isCommonCommand, type PermissionCommand, type PermissionUser, type RolePermissions } from "./RolePermissions";

export class CourierPermission implements RolePermissions {
  canExecute(cmd: PermissionCommand, user: PermissionUser): boolean {
    if (user.role !== Role.COURIER || !user.id?.trim()) return false;
    if (isCommonCommand(cmd)) return true;
    return (cmd.name === "manageCourierAvailability" || cmd.name === "answerOffer") && cmd.courierId === user.id;
  }
}
