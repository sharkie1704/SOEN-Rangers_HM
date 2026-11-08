import type { ReactNode } from "react";
import "./dashboard-sidebar.css";

export interface DashboardNavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
}

interface DashboardSidebarProps {
  items: readonly DashboardNavigationItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function DashboardSidebar({ items, activeId, onSelect }: DashboardSidebarProps) {
  return (
    <nav className="dashboard-sidebar" aria-label="Dashboard navigation">
      <ul className="dashboard-sidebar__items">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="dashboard-sidebar__button"
              aria-current={item.id === activeId ? "page" : undefined}
              title={item.label}
              onClick={() => onSelect(item.id)}
            >
              <span className="dashboard-sidebar__icon" aria-hidden="true">
                {item.icon ?? item.label.slice(0, 1)}
              </span>
              <span className="dashboard-sidebar__label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
