import React, { createContext, useContext, useState, useCallback } from "react";
import { apiFetch } from "../api/apiService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("cs_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((userData, accessToken, refreshToken) => {
    localStorage.setItem("cs_access", accessToken);
    localStorage.setItem("cs_refresh", refreshToken);
    localStorage.setItem("cs_user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cs_access");
    localStorage.removeItem("cs_refresh");
    localStorage.removeItem("cs_user");
    setUser(null);
  }, []);

  const getToken = useCallback(() => localStorage.getItem("cs_access"), []);

  /**
   * authFetch — wraps apiFetch with the stored JWT token.
   * Accepts a PATH (e.g. "/api/rooms/") — NOT a full URL.
   * Automatically fails over between AWS and Oracle.
   */
  const authFetch = useCallback(async (pathOrUrl, options = {}) => {
    const token = localStorage.getItem("cs_access");
    // Support both full URLs (legacy) and paths
    const path = pathOrUrl.startsWith("http")
      ? "/" + pathOrUrl.split("/").slice(3).join("/")
      : pathOrUrl;
    return apiFetch(path, options, token);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken, authFetch, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
