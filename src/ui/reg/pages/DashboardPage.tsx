import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import CourierDashboard from "../../dash/CourierDashboard";
import CustomerDashboard from "../../dash/CustomerDashboard";
import RestaurantStaffDashboard from "../../dash/RestaurantStaffDashboard";
const OperatorDashboard = lazy(() => import("../../dash/OperatorDashboard"));
import DashboardRestaurantMap from "../../dash/DashboardRestaurantMap";
import Header from "../../components/Header";

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

  return (
    <main>
      <Header user={user} onLogout={onLogout} />
      <DashboardRestaurantMap user={{
        id: user.id,
        name: user.name ?? "User",
        role: user.role,
        restaurantId: user.restaurantId,
      }} />
    </main>
  );
}
