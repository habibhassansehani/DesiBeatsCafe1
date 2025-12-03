import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: Omit<User, "password"> | null;
  token: string | null;
  login: (user: Omit<User, "password">, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCashier: boolean;
  isWaiter: boolean;
  isKitchen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Omit<User, "password"> | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("pos_user");
    const storedToken = localStorage.getItem("pos_token");
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch {
        localStorage.removeItem("pos_user");
        localStorage.removeItem("pos_token");
      }
    }
  }, []);

  const login = (userData: Omit<User, "password">, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("pos_user", JSON.stringify(userData));
    localStorage.setItem("pos_token", authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("pos_user");
    localStorage.removeItem("pos_token");
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === "admin",
    isCashier: user?.role === "cashier",
    isWaiter: user?.role === "waiter",
    isKitchen: user?.role === "kitchen",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
