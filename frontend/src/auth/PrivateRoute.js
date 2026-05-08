import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";

// Require authentication — redirect to login if not logged in
export function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Require admin role — redirect to login if not admin
export function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
