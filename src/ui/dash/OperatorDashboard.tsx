import { useState, type ComponentProps } from "react";
import OperatorRestaurantsPage from "../ord/OperatorRestaurantsPage";
import OrderSummaryList from "../prc/OrderSummaryList";
import DashboardLayout from "./DashboardLayout";
import DashboardSidebar, { type DashboardNavigationItem } from "./DashboardSidebar";

type OperatorDashboardProps = Pick<ComponentProps<typeof DashboardLayout>, "user" | "onLogout">;
type OperatorSection = "overview" | "restaurants" | "history";

const items: readonly (DashboardNavigationItem & { readonly id: OperatorSection })[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "restaurants",
    label: "Restaurants",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 10v11h16V10M3 10l2-7h14l2 7M3 10h18M9 21v-7h6v7" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "Order History",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 7h6M9 11h6M9 15h4" />
      </svg>
    ),
  },
];

export default function OperatorDashboard({ user, onLogout }: OperatorDashboardProps) {
  const [activeSection, setActiveSection] = useState<OperatorSection>("overview");

  function selectSection(id: string) {
    const item = items.find((item) => item.id === id);
    if (item) setActiveSection(item.id);
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      sidebar={
        <DashboardSidebar
          items={items}
          activeId={activeSection}
          onSelect={selectSection}
        />
      }
    >
      {activeSection === "overview" && (
        <section aria-label="Operator overview" style={{ padding: "32px 24px", color: "#4B3028" }}>
          <h1 style={{ margin: "0 0 12px" }}>Overview</h1>
          <p>Welcome to your Operator dashboard. Use the menu to manage restaurants or view delivered order summaries.</p>
        </section>
      )}
      {activeSection === "restaurants" && <OperatorRestaurantsPage />}
      {activeSection === "history" && <OrderSummaryList />}
    </DashboardLayout>
  );
}
