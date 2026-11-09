import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import CourierDashboard from "../../dash/CourierDashboard";
import CustomerDashboard from "../../dash/CustomerDashboard";
import RestaurantStaffDashboard from "../../dash/RestaurantStaffDashboard";

const OperatorDashboard = lazy(() => import("../../dash/OperatorDashboard"));

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  if (user.role === "OPERATOR") {
    return (
      <Suspense fallback={<main role="status">Loading operator dashboard…</main>}>
        <OperatorDashboard user={user} onLogout={onLogout} />
      </Suspense>
    );
  }
  if (user.role === "CUSTOMER") {
    return <CustomerDashboard user={user} onLogout={onLogout} />;
  }
  if (user.role === "COURIER") {
    return <CourierDashboard user={user} onLogout={onLogout} />;
  }
  if (user.role === "RESTAURANT" && user.restaurantId) {
    return (
      <RestaurantStaffDashboard
        user={user}
        onLogout={onLogout}
        restaurantId={user.restaurantId}
      />
    );
  }

  return null;
}
