// main entry point
import { StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./ui/reg/auth/AuthContext";
import { createRoot } from "react-dom/client";
import App from "./ui/App";
import "./ui/reg/pages/auth-pages.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
