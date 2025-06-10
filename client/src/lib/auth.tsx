import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "./queryClient";

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  profile: string;
  groups: string[];
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      checkSession();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkSession = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem("sessionId");
      }
    } catch (error) {
      console.error("Session check failed:", error);
      localStorage.removeItem("sessionId");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });

      const data = await response.json();
      localStorage.setItem("sessionId", data.sessionId);
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId");
      if (sessionId) {
        await apiRequest("POST", "/api/auth/logout", {});
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("sessionId");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
