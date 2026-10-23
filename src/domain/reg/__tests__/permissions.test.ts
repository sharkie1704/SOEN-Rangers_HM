import { describe, expect, it, vi } from "vitest";
import { Role } from "../Role";
import {
  hasPermission, PermissionChecker, RolePermissionFactory,
  CustomerPermission, RestaurantPermission, CourierPermission, OperatorPermission,
  type PermissionCommand, type PermissionUser,
} from "../permissions";

const roles = [Role.CUSTOMER, Role.RESTAURANT, Role.COURIER, Role.OPERATOR];
const user = (role: Role): PermissionUser => ({ id: "user-1", role, restaurantId: "rest-1" });

// Expected access policy, independent of how each strategy is implemented.
const cases: [PermissionCommand, Role[]][] = [
  [{ name: "placeOrder" }, [Role.CUSTOMER]],
  [{ name: "customerOrders" }, [Role.CUSTOMER]],
  [{ name: "viewOrder", customerId: "user-1", restaurantId: "rest-1" }, [Role.CUSTOMER, Role.RESTAURANT]],
  [{ name: "viewOrder", customerId: "other", restaurantId: "rest-2" }, []],
  [{ name: "cancelOrder", customerId: "user-1" }, [Role.CUSTOMER]],
  [{ name: "cancelOrder", customerId: "other" }, []],
  [{ name: "manageOrders", restaurantId: "rest-1" }, [Role.RESTAURANT]],
  [{ name: "manageOrders", restaurantId: "rest-2" }, []],
  [{ name: "manageMenu", restaurantId: "rest-1" }, [Role.RESTAURANT]],
  [{ name: "manageMenu", restaurantId: "rest-2" }, []],
  [{ name: "changeRestaurantStatus", restaurantId: "rest-1" }, [Role.RESTAURANT, Role.OPERATOR]],
  [{ name: "changeRestaurantStatus", restaurantId: "rest-2" }, [Role.OPERATOR]],
  [{ name: "createOperator" }, [Role.OPERATOR]],
  [{ name: "browseRestaurants" }, roles],
  [{ name: "browseMenu" }, roles],
  [{ name: "viewProfile" }, roles],
];

describe("role permission policy", () => {
  it.each(cases)("authorizes %j only for the expected roles", (command, allowed) => {
    for (const role of roles) {
      expect(hasPermission(command, user(role)), role).toBe(allowed.includes(role));
    }
  });

  it("denies missing identities, unknown roles and unknown commands", () => {
    for (const identity of [null, undefined, { ...user(Role.CUSTOMER), id: " " },
      { ...user(Role.CUSTOMER), role: "UNKNOWN" as Role }]) {
      expect(hasPermission({ name: "placeOrder" }, identity)).toBe(false);
    }
    for (const role of roles) {
      expect(hasPermission({ name: "unknown" } as unknown as PermissionCommand, user(role))).toBe(false);
    }
  });

  it("does not grant restaurant ownership when both restaurant IDs are empty", () => {
    expect(hasPermission({ name: "manageMenu", restaurantId: "" }, {
      ...user(Role.RESTAURANT), restaurantId: "",
    })).toBe(false);
  });

  it("selects the strategy for each role", () => {
    const factory = new RolePermissionFactory();
    expect(factory.getPermissions(Role.CUSTOMER)).toBeInstanceOf(CustomerPermission);
    expect(factory.getPermissions(Role.RESTAURANT)).toBeInstanceOf(RestaurantPermission);
    expect(factory.getPermissions(Role.COURIER)).toBeInstanceOf(CourierPermission);
    expect(factory.getPermissions(Role.OPERATOR)).toBeInstanceOf(OperatorPermission);
  });

  it("delegates to the selected strategy only for a valid identity", () => {
    const canExecute = vi.fn(() => true);
    const checker = new PermissionChecker({ canExecute });
    expect(checker.checkPermission({ name: "viewProfile" }, null)).toBe(false);
    expect(canExecute).not.toHaveBeenCalled();
    const actor = user(Role.CUSTOMER);
    expect(checker.checkPermission({ name: "viewProfile" }, actor)).toBe(true);
    expect(canExecute).toHaveBeenCalledWith({ name: "viewProfile" }, actor);
  });

  it("cannot use an operator strategy to elevate a customer's permissions", () => {
    const checker = new PermissionChecker(new OperatorPermission());
    expect(checker.checkPermission({ name: "createOperator" }, user(Role.CUSTOMER))).toBe(false);
  });
});
