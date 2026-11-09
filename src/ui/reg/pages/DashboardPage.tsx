import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import OperatorDashboard from "../../dash/OperatorDashboard";
import CourierAvailabilityPage from "../../dlv/CourierAvailabilityPage";
import DashboardRestaurantMap from "../../dash/DashboardRestaurantMap";
import Header from "../../components/Header";
import CustomerDashboard from "../../dash/CustomerDashboard";
import RestaurantStaffDashboard from "../../dash/RestaurantStaffDashboard";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  if (user.role === "OPERATOR") {
    return <OperatorDashboard user={user} onLogout={onLogout} />;
  }
  if (user.role === "CUSTOMER") {
    return <CustomerDashboard user={user} onLogout={onLogout} />;
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

      {user.role === "COURIER" && <CourierAvailabilityPage />}
    </main>
  );
}
