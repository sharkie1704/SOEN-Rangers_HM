import { useAuth } from "../reg/auth/AuthContext";
import "./Header.css";

type HeaderProps = {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  onLogout: () => Promise<void>;
};

const roleLabels: Record<string, string> = {
  CUSTOMER: "Customer",
  RESTAURANT: "Restaurant Staff",
  OPERATOR: "Operator",
  COURIER: "Courier",
};

export default function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="app-header">
      <strong className="app-header__brand">DessertDash</strong>

      <div className="app-header__right">
        <div className="app-header__user">
          <span className="app-header__name">
            {user.name ?? user.id}
          </span>
          <span className="app-header__role">
            {roleLabels[user.role] ?? user.role}
          </span>
        </div>

        <button
          className="app-header__logout"
          onClick={onLogout}
        >
          Log out
        </button>
      </div>
    </header>
  );
}