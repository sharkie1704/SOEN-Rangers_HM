import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import CustomerFlow from "../../ord/CustomerFlow";
import MenuEditorPage from "../../ord/MenuEditorPage";
import RestaurantConsolePage from "../../ord/RestaurantConsolePage";
import OperatorDashboard from "../../dash/OperatorDashboard";
import CourierAvailabilityPage from "../../dlv/CourierAvailabilityPage";
import DashboardRestaurantMap from "../../dash/DashboardRestaurantMap";
import Header from "../../components/Header";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mapRestaurantToOpen, setMapRestaurantToOpen] = useState<string | null>(null);
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
      {/* restaurant map, you can move it someplace else */}
      <DashboardRestaurantMap user={{
        id: user.id,
        name: user.name ?? "User",
        role: user.role,
        restaurantId: user.restaurantId,
      }} onViewMenu={user.role === "CUSTOMER" ? setMapRestaurantToOpen : undefined} />

      {user.role === "CUSTOMER" && (
        <CustomerFlow
          openRestaurantId={mapRestaurantToOpen}
          onRestaurantOpened={() => setMapRestaurantToOpen(null)}
        />
      )}
      {user.role === "RESTAURANT" && user.restaurantId && (
        <>
          <RestaurantConsolePage restaurantId={user.restaurantId} />
          <MenuEditorPage restaurantId={user.restaurantId} />
        </>
      )}
      {user.role === "COURIER" && <CourierAvailabilityPage />}
    </main>
  );
}
