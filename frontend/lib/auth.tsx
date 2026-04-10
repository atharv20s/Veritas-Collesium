"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface AuthUser {
  id: string;
  username: string;
  display_name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  walletLogin: (publicKey: string) => void;
  signup: (username: string, password: string, displayName: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount — supports both API-based and local wallet sessions
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        // Check for local wallet session first (no backend needed)
        const walletUser = localStorage.getItem("veritas-wallet-user");
        if (walletUser) {
          const parsed = JSON.parse(walletUser) as AuthUser;
          if (!cancelled) {
            setUser(parsed);
            setIsLoading(false);
            return;
          }
        }

        const saved = localStorage.getItem("veritas-token");
        if (!saved) {
          setIsLoading(false);
          return;
        }
        setToken(saved);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        try {
          const r = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${saved}` },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (r.ok && !cancelled) {
            const data = await r.json();
            setUser(data);
          } else {
            localStorage.removeItem("veritas-token");
            setToken(null);
          }
        } catch {
          clearTimeout(timeout);
          // If API unavailable but we had a token, still allow access
          setToken(null);
        }
      } catch {
        // localStorage may throw in some environments
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    const safety = setTimeout(() => { if (!cancelled) setIsLoading(false); }, 4000);
    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  async function login(username: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    localStorage.setItem("veritas-token", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function walletLogin(publicKey: string) {
    const shortKey = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
    const walletUser: AuthUser = {
      id: publicKey,
      username: publicKey,
      display_name: `Wallet ${shortKey}`,
    };
    localStorage.setItem("veritas-wallet-user", JSON.stringify(walletUser));
    setUser(walletUser);
    setToken(`wallet-${publicKey}`);
  }

  async function signup(username: string, password: string, displayName: string) {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, display_name: displayName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Signup failed" }));
      throw new Error(err.detail || "Signup failed");
    }
    const data = await res.json();
    localStorage.setItem("veritas-token", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function demoLogin() {
    const res = await fetch(`${API_URL}/api/auth/demo`, { method: "POST" });
    if (!res.ok) throw new Error("Demo login failed");
    const data = await res.json();
    localStorage.setItem("veritas-token", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("veritas-token");
    localStorage.removeItem("veritas-wallet-user");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        walletLogin,
        signup,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Fetch wrapper that attaches the auth token. */
export function useAuthFetch() {
  const { token } = useAuth();
  const tokenRef = React.useRef(token);
  tokenRef.current = token;

  return React.useCallback(
    (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      if (tokenRef.current) headers.set("Authorization", `Bearer ${tokenRef.current}`);
      return fetch(url.startsWith("http") ? url : `${API_URL}${url}`, {
        ...options,
        headers,
      });
    },
    [], // stable — token accessed via ref
  );
}
