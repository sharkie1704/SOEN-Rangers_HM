import type { Role } from "../Role";

// Resource IDs come from loaded domain objects or validated route context,
// never from client-supplied claims about the current user's identity.
export type PermissionCommand =
  | { name: "placeOrder" | "customerOrders" | "createOperator" | "browseRestaurants" | "browseMenu" | "viewProfile" }
  | { name: "viewOrder"; customerId: string; restaurantId: string }
  | { name: "cancelOrder"; customerId: string }
  | { name: "manageOrders" | "manageMenu" | "changeRestaurantStatus"; restaurantId: string };

export interface PermissionUser {
  readonly id: string;
  readonly role: Role;
  readonly restaurantId?: string;
}

export interface RolePermissions {
  canExecute(cmd: PermissionCommand, user: PermissionUser): boolean;
}

export function isCommonCommand(cmd: PermissionCommand): boolean {
  return cmd.name === "browseRestaurants" || cmd.name === "browseMenu" || cmd.name === "viewProfile";
}
