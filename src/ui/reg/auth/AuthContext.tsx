import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api/client";

export type Role = "CUSTOMER" | "RESTAURANT" | "COURIER" | "OPERATOR";

export interface AuthUser {
  id: string;
  role: Role;
  name?: string; // only present right after login/register
  email?: string;
  restaurantId?: string;
}

type Base = { name: string; email: string; password: string };
export type RegisterData =
  | (Base & { role: "CUSTOMER"; address: { lat: number; lng: number } })
  | (Base & { role: "COURIER" })
  | (Base & { role: "RESTAURANT"; restaurantId: string });

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  register(data: RegisterData): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: AuthUser }>("/api/auth/me")
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api<{ user: AuthUser }>("/api/auth/login", { method: "POST", body: { email, password } });
    setUser(r.user);
  };

  const register = async (data: RegisterData) => {
    await api("/api/auth/register", { method: "POST", body: data });
    await login(data.email, data.password); // log in straight after signing up
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}