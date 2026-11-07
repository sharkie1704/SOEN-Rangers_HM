import type { ComponentProps, ReactNode } from "react";
import Header from "../components/Header";
import "./dashboard-layout.css";

type DashboardLayoutProps = ComponentProps<typeof Header> & {
  children: ReactNode;
  sidebar?: ReactNode;
};

export default function DashboardLayout({ user, onLogout, children, sidebar }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <Header user={user} onLogout={onLogout} />
      <div className="dashboard-layout__body">
        {sidebar && (
          <aside className="dashboard-layout__sidebar" aria-label="Dashboard sidebar">
            {sidebar}
          </aside>
        )}
        <div className="dashboard-layout__content">{children}</div>
      </div>
    </div>
  );
}
