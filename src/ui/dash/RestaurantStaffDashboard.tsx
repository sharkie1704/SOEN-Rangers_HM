import { useState, type ComponentProps } from "react";
import MenuEditorPage from "../ord/MenuEditorPage";
import RestaurantConsolePage from "../ord/RestaurantConsolePage";
import DashboardRestaurantMap from "./DashboardRestaurantMap";
import DashboardLayout from "./DashboardLayout";
import DashboardSidebar, { type DashboardNavigationItem } from "./DashboardSidebar";
import "./restaurant-staff-dashboard.css";

type RestaurantStaffDashboardProps = Pick<ComponentProps<typeof DashboardLayout>, "user" | "onLogout"> & {
  restaurantId: string;
};
type RestaurantSection = "orders" | "menu";

const items: readonly DashboardNavigationItem[] = [
  {
    id: "orders",
    label: "Orders",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    id: "menu",
    label: "Menu",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 2-3 5-3 9h6V3M17 12v9" />
      </svg>
    ),
  },
];


