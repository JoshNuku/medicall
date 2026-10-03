'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Fallback demo users in case backend is offline
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'pharmacist@medicall.gh': {
    password: 'password123',
    user: {
      id: 1,
      email: 'pharmacist@medicall.gh',
      name: 'Dr. Kwame Mensah',
      role: 'Lead Clinical Pharmacist'
    }
  },
  'nukujosh119@gmail.com': {
    password: 'password123',
    user: {
      id: 2,
      email: 'nukujosh119@gmail.com',
      name: 'Josh Nuku',
      role: 'Pharmacist Admin'
    }
  },
  'admin@medicall.gh': {
    password: 'medicall2026',
    user: {
      id: 3,
      email: 'admin@medicall.gh',
      name: 'MediCall Admin',
      role: 'Clinical Operations'
    }
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from localStorage and revalidate
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('medicall_auth_token');
      const storedUser = localStorage.getItem('medicall_user');

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);

        // Optionally verify token with backend
        fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        })
          .then((res) => {
            if (res.ok) return res.json();
            // If token expired or invalid, keep user if it was demo, or clear
            return null;
          })
          .then((data) => {
            if (data?.user) {
              setUser(data.user);
              localStorage.setItem('medicall_user', JSON.stringify(data.user));
            }
          })
          .catch(() => {
            // Keep existing session if offline
          });
      }
    } catch (err) {
      console.error('[Auth] Failed to restore session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Attempt backend authentication
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('medicall_auth_token', data.token);
          localStorage.setItem('medicall_user', JSON.stringify(data.user));
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
      // Backend not running / connection failed -> check local demo fallback
      console.warn('[Auth] Backend unreachable, verifying with offline demo credentials.');
    }

    // 2. Offline / Demo account fallback
    const demo = DEMO_USERS[cleanEmail];
    if (demo && demo.password === password) {
      const demoToken = `demo_token_${Date.now()}`;
      setUser(demo.user);
      setToken(demoToken);
      localStorage.setItem('medicall_auth_token', demoToken);
      localStorage.setItem('medicall_user', JSON.stringify(demo.user));
      document.cookie = `medicall_auth=1; path=/; max-age=604800; SameSite=Lax`;
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid email or password. Please check your credentials.'
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token && !token.startsWith('demo_token_')) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('medicall_auth_token');
      localStorage.removeItem('medicall_user');
      document.cookie = `medicall_auth=; path=/; max-age=0; SameSite=Lax`;
      router.push('/login');
    }
  }, [token, router]);

  const updateUser = useCallback((updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updated };
      try {
        localStorage.setItem('medicall_user', JSON.stringify(nextUser));
      } catch (_) {}
      return nextUser;
    });
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
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
