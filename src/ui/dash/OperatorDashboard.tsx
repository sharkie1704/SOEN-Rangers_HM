import { useEffect, useState, type ComponentProps } from "react";
import OperatorRestaurantsPage, { type OperatorRestaurant } from "../ord/OperatorRestaurantsPage";
import { api, ApiError } from "../reg/api/client";
import OperatorOverview from "./OperatorOverview";
import OrderSummaryList from "../prc/OrderSummaryList";
import DashboardLayout from "./DashboardLayout";
import DashboardSidebar, { type DashboardNavigationItem } from "./DashboardSidebar";

type OperatorDashboardProps = Pick<ComponentProps<typeof DashboardLayout>, "user" | "onLogout">;
type OperatorSection = "overview" | "restaurants" | "orders" | "history" | "simulator";

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
    id: "history",
    label: "Order History & Billing",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 7h6M9 11h6M9 15h4" />
      </svg>
    ),
  },
  {
    id: "simulator",
    label: "Simulator Controls",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M5 3v7M5 14v7M12 3v11M12 18v3M19 3v3M19 10v11" />
        <path d="M2 10h6v4H2zM9 14h6v4H9zM16 6h6v4h-6z" />
      </svg>
    ),
  },
];

export default function OperatorDashboard({ user, onLogout }: OperatorDashboardProps) {
  const [activeSection, setActiveSection] = useState<OperatorSection>("overview");

  const [restaurants, setRestaurants] = useState<OperatorRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRestaurants() {
      try {
        const res = await api<{ restaurants: OperatorRestaurant[] }>("/api/restaurants");
        if (!cancelled) setRestaurants(res.restaurants);
      } catch {
        if (!cancelled) setError("Could not load restaurants. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRestaurants();
    return () => { cancelled = true; };
  }, []);

  async function changeStatus(restaurant: OperatorRestaurant, status: "PAUSED" | "OPEN") {
    try {
      const res = await api<{ restaurant: { id: string; status: OperatorRestaurant["status"] }; eventId: number }>(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/status`,
        { method: "PATCH", body: { status } },
      );
      setRestaurants((current) =>
        current.map((r) => (r.id === res.restaurant.id ? { ...r, status: res.restaurant.status } : r)),
      );
      setMessage(`${restaurant.name} ${status === "PAUSED" ? "paused" : "reopened"} (event #${res.eventId})`);
    } catch (e) {
      setMessage(e instanceof ApiError ? `Error: ${e.message}` : "Error: request failed");
    }
  }

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
        <OperatorOverview restaurants={restaurants} loading={loading} error={error} />
      )}
      {activeSection === "restaurants" && (
        <OperatorRestaurantsPage
          restaurants={restaurants}
          loading={loading}
          error={error}
          message={message}
          onChangeStatus={changeStatus}
        />
      )}
      {activeSection === "history" && <OrderSummaryList />}
    </DashboardLayout>
  );
}
