import type { ComponentProps } from "react";
import OperatorRestaurantsPage from "../ord/OperatorRestaurantsPage";
import OrderSummaryList from "../prc/OrderSummaryList";
import BillingLedger from "../prc/BillingLedger";
import DashboardLayout from "./DashboardLayout";
import DashboardSidebar, { type DashboardNavigationItem } from "./DashboardSidebar";

type OperatorDashboardProps = Pick<ComponentProps<typeof DashboardLayout>, "user" | "onLogout">;

const items: readonly DashboardNavigationItem[] = [
  { id: "restaurants", label: "Restaurants" },
];

export default function OperatorDashboard({ user, onLogout }: OperatorDashboardProps) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      sidebar={
        <DashboardSidebar
          items={items}
          activeId="restaurants"
          // Restaurants is the only page, so selecting it keeps the current view.
          onSelect={() => {}}
        />
      }
    >
      <OperatorRestaurantsPage />
      <OrderSummaryList />
      <BillingLedger />
    </DashboardLayout>
  );
}
