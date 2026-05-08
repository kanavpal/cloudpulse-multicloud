import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import "./AuthPage.css";
import "./AdminLoginPage.css";

const AWS_BASE = "http://52.206.184.80:8000";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${AWS_BASE}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      if (data.role !== "admin") throw new Error("Access denied — admin credentials required");
      login({ username: data.username, role: data.role, id: data.id }, data.access, data.refresh);
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page admin-login-bg">
      <div className="auth-card admin-card">
        <div className="admin-login-badge">🔐 ADMIN PORTAL</div>
        <div className="auth-logo">⚡</div>
        <h1 className="auth-title">CloudPulse Admin</h1>
        <p className="auth-sub">Multi-Cloud Operations Dashboard</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Admin Username</label>
            <input className="auth-input" type="text" placeholder="admin" required
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input className="auth-input" type="password" placeholder="••••••••" required
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <div className="auth-error">🚫 {error}</div>}
          <button className="auth-submit admin-submit" type="submit" disabled={loading}>
            {loading ? "Verifying…" : "Access Admin Dashboard →"}
          </button>
        </form>
      </div>
    </div>
  );
}
