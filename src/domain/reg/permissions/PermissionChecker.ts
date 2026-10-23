import { RolePermissionFactory } from "./RolePermissionFactory";
import type { PermissionCommand, PermissionUser, RolePermissions } from "./RolePermissions";

export class PermissionChecker {
  constructor(private readonly permissions: RolePermissions) {}

  checkPermission(cmd: PermissionCommand, user: PermissionUser | null | undefined): boolean {
    return !!user && typeof user.id === "string" && !!user.id.trim()
      && this.permissions.canExecute(cmd, user);
  }
}

// Resolve one strategy for the authenticated user's single role.
export function hasPermission(cmd: PermissionCommand, user: PermissionUser | null | undefined): boolean {
  if (!user) return false;
  const permissions = new RolePermissionFactory().getPermissions(user.role);
  return new PermissionChecker(permissions).checkPermission(cmd, user);
}
