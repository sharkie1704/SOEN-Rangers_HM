import "./dashboard-sidebar.css";

export interface DashboardNavigationItem {
  readonly id: string;
  readonly label: string;
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
              onClick={() => onSelect(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
