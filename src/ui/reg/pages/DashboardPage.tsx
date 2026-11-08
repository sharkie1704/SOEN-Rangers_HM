import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import CustomerFlow from "../../ord/CustomerFlow";
import MenuEditorPage from "../../ord/MenuEditorPage";
import RestaurantConsolePage from "../../ord/RestaurantConsolePage";
import OperatorDashboard from "../../dash/OperatorDashboard";
import CourierAvailabilityPage from "../../dlv/CourierAvailabilityPage";
import Header from "../../components/Header";
import OrderSummaryList from "../../prc/OrderSummaryList";

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

  return (
    <main>
      <Header user={user} onLogout={onLogout} />

      {user.role === "CUSTOMER" && < CustomerFlow />}
      {user.role === "RESTAURANT" && user.restaurantId && (
        <>
          <RestaurantConsolePage restaurantId={user.restaurantId} />
          <MenuEditorPage restaurantId={user.restaurantId} />
        </>
      )}
      {user.role === "OPERATOR" && (
        <>
          <OperatorRestaurantsPage />
          <OrderSummaryList />
        </>
      )}
      {user.role === "COURIER" && <CourierAvailabilityPage />}
    </main>
  );
}
