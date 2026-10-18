import { Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth } from "./reg/auth/RequireAuth";
import LoginPage from "./reg/pages/LoginPage";
import RegistrationPage from "./reg/pages/RegistrationPage";
import DashboardPage from "./reg/pages/DashboardPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}