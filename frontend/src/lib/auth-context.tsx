"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
  hideSettings: boolean;
  setHideSettings: (hide: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL &&
  !process.env.NEXT_PUBLIC_BACKEND_URL.includes("localhost")
    ? process.env.NEXT_PUBLIC_BACKEND_URL
    : "/api/backend";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from localStorage and revalidate
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("medicall_auth_token");
      const storedUser = localStorage.getItem("medicall_user");

      if (storedToken?.startsWith("demo_token_")) {
        localStorage.removeItem("medicall_auth_token");
        localStorage.removeItem("medicall_user");
        document.cookie = "medicall_auth=; path=/; max-age=0; SameSite=Lax";
      }

      if (storedToken && storedUser && !storedToken.startsWith("demo_token_")) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);

        // Optionally verify token with backend
        fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
          .then((res) => {
            if (res.ok) return res.json();
            return null;
          })
          .then((data) => {
            if (data?.user) {
              setUser(data.user);
              localStorage.setItem("medicall_user", JSON.stringify(data.user));
            }
          })
          .catch(() => {
            // Keep existing session if offline
          });
      }
    } catch (err) {
      console.error("[Auth] Failed to restore session:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();

      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            setToken(data.token);
            localStorage.setItem("medicall_auth_token", data.token);
            localStorage.setItem("medicall_user", JSON.stringify(data.user));
            document.cookie = `medicall_auth=1; path=/; max-age=604800; SameSite=Lax`;
            return { success: true };
          }
        } else {
          const errJson = await response.json().catch(() => null);
          if (errJson?.error) {
            return { success: false, error: errJson.error };
          }
        }
      } catch (_netErr) {
        return {
          success: false,
          error: "Unable to reach the authentication server. Please try again.",
        };
      }

      return {
        success: false,
        error: "Invalid email or password. Please check your credentials.",
      };
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("medicall_auth_token");
      localStorage.removeItem("medicall_user");
      document.cookie = `medicall_auth=; path=/; max-age=0; SameSite=Lax`;
      router.push("/login");
    }
  }, [token, router]);

  const updateUser = useCallback((updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updated };
      try {
        localStorage.setItem("medicall_user", JSON.stringify(nextUser));
      } catch (_) {}
      return nextUser;
    });
  }, []);

  const [hideSettings, setHideSettingsState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("medicall_hide_settings");
      if (stored === "true") {
        setHideSettingsState(true);
      }
    } catch (_) {}
  }, []);

  const setHideSettings = useCallback((hide: boolean) => {
    setHideSettingsState(hide);
    try {
      localStorage.setItem("medicall_hide_settings", hide ? "true" : "false");
    } catch (_) {}
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
        hideSettings,
        setHideSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
