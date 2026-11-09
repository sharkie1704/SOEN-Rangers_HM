import { useState, type ComponentProps } from "react";
import CustomerFlow from "../ord/CustomerFlow";
import DashboardRestaurantMap from "./DashboardRestaurantMap";
import DashboardLayout from "./DashboardLayout";
import DashboardSidebar, { type DashboardNavigationItem } from "./DashboardSidebar";
import WelcomePage from "./WelcomePage";
import "./customer-dashboard.css";

type CustomerDashboardProps = Pick<ComponentProps<typeof DashboardLayout>, "user" | "onLogout">;
type CustomerSection = "browse" | "orders";

const items: readonly DashboardNavigationItem[] = [
  {
    id: "browse",
    label: "Browse Restaurants",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 10v11h16V10M3 10l2-7h14l2 7M3 10h18M9 21v-7h6v7" />
      </svg>
    ),
  },
  {
    id: "orders",
    label: "My Orders",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
];

