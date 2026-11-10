import { useState, type ComponentProps } from "react";
import type { AuthUser } from "../reg/auth/AuthContext";
import CourierAvailabilityPage from "../dlv/CourierAvailabilityPage";
import DashboardRestaurantMap from "./DashboardRestaurantMap";
import DashboardLayout from "./DashboardLayout";
import DashboardSidebar, { type DashboardNavigationItem } from "./DashboardSidebar";
import WelcomePage from "./WelcomePage";
import CourierDeliveriesPage from "./CourierDeliveriesPage";
import OrderSummaryList from "../prc/OrderSummaryList";

type CourierDashboardProps = Pick<ComponentProps<typeof DashboardLayout>, "onLogout"> & {
  user: AuthUser;
};
type CourierSection = "overview" | "availability" | "deliveries" | "history";

const items: readonly DashboardNavigationItem[] = [
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
    id: "availability",
    label: "Availability",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    id: "deliveries",
    label: "My Deliveries",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M3 7h11v11H3zM14 11h4l3 3v4h-7z" />
        <circle cx="7.5" cy="19" r="1.5" />
        <circle cx="18" cy="19" r="1.5" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "History",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
];

export default function CourierDashboard({ user, onLogout }: CourierDashboardProps) {
  const [activeSection, setActiveSection] = useState<CourierSection>("overview");

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      sidebar={
        <DashboardSidebar
          items={items}
          activeId={activeSection}
          onSelect={(id) => {
            if (id === "overview" || id === "availability" || id === "deliveries" || id === "history") setActiveSection(id);
          }}
        />
      }
    >
      {activeSection === "overview" && (
        <>
          <WelcomePage
            name={user.name ?? ""}
            description="Check your courier availability and manage assigned deliveries."
          />
          <div style={{ maxWidth: "1200px", margin: "24px auto 0", padding: "0 16px", color: "#4B3028" }}>
            <h2>Courier overview</h2>
            <p>See nearby restaurants and keep track of your delivery work.</p>
          </div>
          <DashboardRestaurantMap
            user={{
              id: user.id,
              name: user.name ?? "User",
              role: user.role,
              restaurantId: user.restaurantId,
            }}
          />
        </>
      )}
      {activeSection === "availability" && <CourierAvailabilityPage />}
      {activeSection === "deliveries" && <CourierDeliveriesPage key={user.id} user={user} />}
      {activeSection === "history" && <OrderSummaryList courierView />}
    </DashboardLayout>
  );
}
