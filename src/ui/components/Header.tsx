import { useAuth } from "../reg/auth/AuthContext";
import { api } from "../reg/api/client";
import { useApi } from "../reg/api/useApi";
import "./Header.css";

type HeaderProps = {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  onLogout: () => Promise<void>;
  onCourierRatingClick?: () => void;
};

const roleLabels: Record<string, string> = {
  CUSTOMER: "Customer",
  RESTAURANT: "Restaurant Staff",
  OPERATOR: "Operator",
  COURIER: "Courier",
};

export default function Header({ user, onLogout, onCourierRatingClick }: HeaderProps) {
  const courierRating = useApi(
    () => api<{ rating: { average: number } | null }>("/api/couriers/me/rating"),
    "Could not load courier rating.",
    [user.id, user.role],
  );
  return (
    <header className="app-header">
      <strong className="app-header__brand">DessertDash</strong>

      <div className="app-header__right">
        <div className="app-header__user">
          <span className="app-header__name">
            {user.name ?? user.id}
          </span>
          {user.role === "COURIER" && onCourierRatingClick ? (
            <button type="button" className="app-header__role app-header__role--link" onClick={onCourierRatingClick}>
              {roleLabels[user.role] ?? user.role} · {courierRating.loading ? "…" : courierRating.data?.rating
                ? `${courierRating.data.rating.average.toFixed(1)} ★`
                : "No ratings"}
            </button>
          ) : <span className="app-header__role">{roleLabels[user.role] ?? user.role}</span>}
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
