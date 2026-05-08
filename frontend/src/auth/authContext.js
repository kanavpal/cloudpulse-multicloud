import React, { createContext, useContext, useState, useCallback } from "react";

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

  // Authenticated fetch helper — adds Bearer token automatically
  const authFetch = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem("cs_access");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    return fetch(url, { ...options, headers });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
