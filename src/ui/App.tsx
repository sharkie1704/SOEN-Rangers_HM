import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./reg/pages/LoginPage";
import RegistrationPage from "./reg/pages/RegistrationPage";
import DashboardPage from "./reg/pages/DashboardPage";
import PublicLandingPage from "./pages/PublicLandingPage";
import { useAuth } from "./reg/auth/AuthContext";

function HomePage() {
  const { user, loading } = useAuth();
  if (loading) return <main className="public-home-loading" role="status">Loading DessertDash…</main>;
  return user ? <DashboardPage /> : <PublicLandingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/discover" element={<PublicLandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
