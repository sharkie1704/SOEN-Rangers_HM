import { useId, useState, type ComponentProps, type ReactNode } from "react";
import Header from "../components/Header";
import "./dashboard-layout.css";

type DashboardLayoutProps = ComponentProps<typeof Header> & {
  children: ReactNode;
  sidebar?: ReactNode;
};

export default function DashboardLayout({ user, onLogout, children, sidebar }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigationId = useId();

  return (
    <div className={`dashboard-layout${collapsed ? " dashboard-layout--collapsed" : ""}`}>
      <Header user={user} onLogout={onLogout} />
      <div className="dashboard-layout__body">
        {sidebar && (
          <aside className="dashboard-layout__sidebar" aria-label="Dashboard sidebar">
            <button
              type="button"
              className="dashboard-layout__toggle"
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              aria-expanded={!collapsed}
              aria-controls={navigationId}
              onClick={() => setCollapsed((current) => !current)}
            >
              <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div id={navigationId} className="dashboard-layout__navigation">
              {sidebar}
            </div>
          </aside>
        )}
        <div className="dashboard-layout__content">{children}</div>
      </div>
    </div>
  );
}
