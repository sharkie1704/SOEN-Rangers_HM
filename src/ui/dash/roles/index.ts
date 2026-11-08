import type { RoleMapViewBuilder, SessionRole } from "./RoleMapView";
import { buildCustomerMapView } from "./CustomerMapView";
import { buildStaffMapView } from "./StaffMapView";
import { buildCourierMapView } from "./CourierMapView";
import { buildOperatorMapView } from "./OperatorMapView";

// makes a missing role a compile error
const builders: Record<SessionRole, RoleMapViewBuilder> = {
  CUSTOMER: buildCustomerMapView,
  RESTAURANT: buildStaffMapView,
  COURIER: buildCourierMapView,
  OPERATOR: buildOperatorMapView,
};

export const buildRoleMapView = (role: SessionRole): RoleMapViewBuilder => builders[role];
export * from "./RoleMapView";