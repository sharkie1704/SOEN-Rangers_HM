import { useEffect, useId, useState, type ComponentProps } from "react";
import OperatorRestaurantsPage, { type OperatorRestaurant } from "../ord/OperatorRestaurantsPage";
import { api, ApiError } from "../reg/api/client";
import OperatorOverview from "./OperatorOverview";
import OrderSummaryList from "../prc/OrderSummaryList";
import BillingLedger from "../prc/BillingLedger";
import OperatorOrdersPage from "../ord/OperatorOrdersPage";
import OperatorDispatchQueuePage from "../ord/OperatorDispatchQueuePage";
import DashboardLayout from "./DashboardLayout";
import { useDashboardOutputConsoleActive } from "./DashboardOutputConsoleContext";
import type { DashboardNavigationItem } from "./DashboardSidebar";
import WelcomePage from "./WelcomePage";
import "./dashboard-sidebar.css";
import "./operator-dashboard.css";

type OperatorDashboardProps = Pick<ComponentProps<typeof DashboardLayout>, "user" | "onLogout">;
type OperatorSection = "overview" | "restaurants" | "orders" | "dispatch" | "history" | "ledger" | "simulator";

const items: readonly (DashboardNavigationItem & { readonly id: OperatorSection | "billing" })[] = [
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
    id: "dispatch",
    label: "Dispatch Queue",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M3 6h12v12H3zM15 10h4l3 4v4h-7z" />
        <circle cx="7" cy="19" r="1.5" />
        <circle cx="18" cy="19" r="1.5" />
      </svg>
    ),
  },
  {
    id: "billing",
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

const billingItems: readonly (DashboardNavigationItem & { readonly id: "history" | "ledger" })[] = [
  {
    id: "history",
    label: "Order History",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    id: "ledger",
    label: "Billing Ledger",
    icon: (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 3v18M12 8h5M12 12h5M12 16h5" />
      </svg>
    ),
  },
];

interface OperatorNavigationProps {
  activeSection: OperatorSection;
  billingExpanded: boolean;
  billingNavigationId: string;
  onSelectSection: (id: string) => void;
}

function OperatorNavigation({
  activeSection,
  billingExpanded,
  billingNavigationId,
  onSelectSection,
}: OperatorNavigationProps) {
  const outputConsoleActive = useDashboardOutputConsoleActive();
  const billingSelected = activeSection === "history" || activeSection === "ledger";

  return (
    <nav className="dashboard-sidebar operator-navigation" aria-label="Dashboard navigation">
      <ul className="dashboard-sidebar__items">
        {items.map((item) => (
          <li key={item.id} className={item.id === "billing" ? "operator-navigation__group" : undefined}>
            <button
              type="button"
              className="dashboard-sidebar__button"
              aria-current={!outputConsoleActive && item.id === activeSection ? "page" : undefined}
              aria-expanded={item.id === "billing" ? billingExpanded : undefined}
              aria-controls={item.id === "billing" ? billingNavigationId : undefined}
              data-child-selected={item.id === "billing" && billingSelected && !outputConsoleActive ? "true" : undefined}
              title={item.label}
              onClick={() => onSelectSection(item.id)}
            >
              <span className="dashboard-sidebar__icon" aria-hidden="true">{item.icon}</span>
              <span className="dashboard-sidebar__label">{item.label}</span>
              {item.id === "billing" && (
                <svg className="operator-navigation__chevron" aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={billingExpanded ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
                </svg>
              )}
            </button>
            {item.id === "billing" && (
              <ul id={billingNavigationId} className="operator-navigation__children" hidden={!billingExpanded}>
                {billingItems.map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      className="dashboard-sidebar__button"
                      aria-current={!outputConsoleActive && child.id === activeSection ? "page" : undefined}
                      title={child.label}
                      onClick={() => onSelectSection(child.id)}
                    >
                      <span className="dashboard-sidebar__icon" aria-hidden="true">{child.icon}</span>
                      <span className="dashboard-sidebar__label">{child.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function OperatorDashboard({ user, onLogout }: OperatorDashboardProps) {
  const [activeSection, setActiveSection] = useState<OperatorSection>("overview");
  const [billingExpanded, setBillingExpanded] = useState(false);
  const billingNavigationId = useId();

  const [restaurants, setRestaurants] = useState<OperatorRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetting, setResetting] = useState(false);
  const [restaurantReload, setRestaurantReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

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
  }, [restaurantReload]);

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

  async function resetApp() {
    if (!window.confirm("Reset the application? This permanently deletes all database data.")) return;
    setResetting(true);
    setMessage("");
    try {
      await api<void>("/api/admin/reset", { method: "POST" });
      await onLogout();
    } catch (e) {
      setMessage(e instanceof ApiError ? `Error: ${e.message}` : "Error: reset failed");
      setResetting(false);
    }
  }

  function selectSection(id: string) {
    if (id === "billing") {
      setBillingExpanded((expanded) => !expanded);
      return;
    }
    if (id === "history" || id === "ledger") {
      setActiveSection(id);
      return;
    }
    const item = items.find((item) => item.id === id);
    if (item && item.id !== "billing") setActiveSection(item.id);
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      sidebar={
        <OperatorNavigation
          activeSection={activeSection}
          billingExpanded={billingExpanded}
          billingNavigationId={billingNavigationId}
          onSelectSection={selectSection}
        />
      }
    >
      {activeSection === "overview" && (
        <>
          <WelcomePage
            name={user.name ?? ""}
            description="Review activity and keep DessertDash running smoothly."
          />
          <OperatorOverview
            restaurants={restaurants}
            loading={loading}
            error={error}
            onRefresh={() => setRestaurantReload((current) => current + 1)}
            onNavigate={setActiveSection}
          />
        </>
      )}
      {activeSection === "restaurants" && (
        <OperatorRestaurantsPage
          restaurants={restaurants}
          loading={loading}
          error={error}
          message={message}
          onChangeStatus={changeStatus}
          onRefresh={() => setRestaurantReload((current) => current + 1)}
        />
      )}
      {activeSection === "orders" && <OperatorOrdersPage restaurants={restaurants} />}
      {activeSection === "dispatch" && <OperatorDispatchQueuePage />}
      {activeSection === "history" && <OrderSummaryList operatorView />}
      {activeSection === "ledger" && <BillingLedger />}
      {activeSection === "simulator" && (
        <section className="operator-simulator" aria-label="Simulator controls">
          <p className="operator-simulator__eyebrow">ADMINISTRATION</p>
          <h1>Simulator controls</h1>
          <p>Reset the development environment to its initial state. This permanently deletes users, restaurants, orders, events, assignments, and billing data.</p>
          <div className="operator-simulator__danger">
            <div>
              <h2>Reset application data</h2>
              <p>This action cannot be undone. You will be signed out after the reset completes.</p>
            </div>
            <button type="button" onClick={() => void resetApp()} disabled={resetting}>
              {resetting ? "Resetting application…" : "Reset application"}
            </button>
          </div>
          {message && <p className="operator-simulator__error" role="alert">{message}</p>}
        </section>
      )}
    </DashboardLayout>
  );
}
