import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import CustomerFlow from "../../ord/CustomerFlow";
import MenuEditorPage from "../../ord/MenuEditorPage";
import OperatorRestaurantsPage from "../../ord/OperatorRestaurantsPage";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <main>
      <header>
        <strong>DessertDash</strong>
        <span>{user.name ?? user.id} ({user.role})</span>
        <button onClick={onLogout}>Log out</button>
      </header>

      {user.role === "CUSTOMER" && < CustomerFlow />}
      {user.role === "RESTAURANT" && user.restaurantId && <MenuEditorPage restaurantId={user.restaurantId} />}
      {user.role === "OPERATOR" && <OperatorRestaurantsPage />}
      {user.role === "COURIER" && <p>Couriers have no screen in Phase II.</p>}
    </main>
  );
}