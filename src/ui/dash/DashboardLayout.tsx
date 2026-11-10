import { useId, useState, type ComponentProps, type ReactNode } from "react";
import Header from "../components/Header";
import DashboardOutputConsole from "./DashboardOutputConsole";
import { DashboardOutputConsoleContext } from "./DashboardOutputConsoleContext";
import "./dashboard-layout.css";

type DashboardLayoutProps = ComponentProps<typeof Header> & {
  children: ReactNode;
  sidebar?: ReactNode;
};

export default function DashboardLayout({ user, onLogout, children, sidebar }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showOutputConsole, setShowOutputConsole] = useState(false);
  const navigationId = useId();

  return (
    <DashboardOutputConsoleContext.Provider value={showOutputConsole}>
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
              <div
                id={navigationId}
                className="dashboard-layout__navigation"
                onClickCapture={(event) => {
                  const target = event.target;
                  if (!(target instanceof Element) || !target.closest("[data-output-console-tab]")) {
                    setShowOutputConsole(false);
                  }
                }}
              >
                {sidebar}
                <nav className="dashboard-layout__console-navigation" aria-label="System tools">
                  <ul className="dashboard-sidebar__items">
                    <li>
                      <button
                        type="button"
                        className="dashboard-sidebar__button"
                        aria-current={showOutputConsole ? "page" : undefined}
                        title="Output Console"
                        data-output-console-tab
                        onClick={() => setShowOutputConsole((visible) => !visible)}
                      >
                        <span className="dashboard-sidebar__icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <path d="M4 5h16v14H4zM7 9l3 3-3 3M12 15h5" />
                          </svg>
                        </span>
                        <span className="dashboard-sidebar__label">Output Console</span>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </aside>
          )}
          <div className="dashboard-layout__content" hidden={showOutputConsole}>{children}</div>
          <div className="dashboard-layout__content" hidden={!showOutputConsole}>
            <DashboardOutputConsole />
          </div>
        </div>
      </div>
    </DashboardOutputConsoleContext.Provider>
  );
}
