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

export default function CustomerDashboard({ user, onLogout }: CustomerDashboardProps) {
  const [activeSection, setActiveSection] = useState<CustomerSection>("browse");
  const [mapRestaurantToOpen, setMapRestaurantToOpen] = useState<string | null>(null);

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      sidebar={
        <DashboardSidebar
          items={items}
          activeId={activeSection}
          onSelect={(id) => {
            if (id === "browse" || id === "orders") setActiveSection(id);
          }}
        />
      }
    >
      {activeSection === "browse" && (
        <>
          <WelcomePage name={user.name ?? ""} />
          <div className="customer-dashboard__map-heading">
            <div>
              <h2>Explore restaurants nearby</h2>
              <p>Choose a map pin to open a restaurant’s menu.</p>
            </div>
            <span aria-hidden="true">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4M12 9v3l2 1" />
              </svg>
            </span>
          </div>
          <DashboardRestaurantMap
            user={{
              id: user.id,
              name: user.name ?? "User",
              role: user.role,
              restaurantId: user.restaurantId,
            }}
            onViewMenu={setMapRestaurantToOpen}
          />
        </>
      )}
      <CustomerFlow
        activeView={activeSection}
        openRestaurantId={mapRestaurantToOpen}
        onRestaurantOpened={() => setMapRestaurantToOpen(null)}
      />
    </DashboardLayout>
  );
}

