import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import MonitoringDashboard from "./MonitoringDashboard";
import "./AdminDashboard.css";

const AWS_BASE = "http://52.206.184.80:8000";

export default function AdminDashboard() {
  const { authFetch, logout, user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [awsSimDown, setAwsSimDown] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [sRes, bRes] = await Promise.all([
        authFetch(`${AWS_BASE}/api/admin/bookings/stats/`),
        authFetch(`${AWS_BASE}/api/admin/bookings/`),
      ]);
      const [s, b] = await Promise.all([sRes.json(), bRes.json()]);
      setStats(s);
      setBookings(Array.isArray(b) ? b.slice(0, 15) : []);
    } catch { /* silently fail */ }
  }, [authFetch]);

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 5000);
    return () => clearInterval(iv);
  }, [fetchStats]);

  const handleLogout = () => { logout(); navigate("/admin/login"); };

  const cloudCount = (cloud) =>
    stats?.by_cloud?.find((c) => c.served_by_cloud === cloud)?.count || 0;

  return (
    <div className="admin-dash">
      {/* ── Admin Top Bar ── */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <span className="admin-topbar-logo">⚡</span>
          <span className="admin-topbar-brand">CloudPulse <span className="admin-topbar-sep">›</span> Admin Dashboard</span>
          <span className="admin-topbar-live"><span className="admin-topbar-dot" />LIVE</span>
        </div>
        <div className="admin-topbar-right">
          <span className="admin-topbar-user">👤 {user?.username}</span>
          <button className="admin-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="admin-content">
        {/* ── Booking Stats Row ── */}
        <div className="admin-section-label">📦 Booking Overview</div>
        <div className="admin-stats-row">
          <div className="admin-stat-card total">
            <div className="admin-stat-label">Total Bookings</div>
            <div className="admin-stat-val">{stats?.total_bookings ?? "—"}</div>
            <div className="admin-stat-sub">{stats?.confirmed ?? 0} confirmed · {stats?.cancelled ?? 0} cancelled</div>
          </div>
          <div className="admin-stat-card aws">
            <div className="admin-stat-label">☁️ AWS Bookings</div>
            <div className="admin-stat-val">{cloudCount("AWS")}</div>
            <div className="admin-stat-sub">Processed by AWS EC2</div>
          </div>
          <div className="admin-stat-card oracle">
            <div className="admin-stat-label">☁️ Oracle Bookings</div>
            <div className="admin-stat-val">{cloudCount("Oracle")}</div>
            <div className="admin-stat-sub">Processed by Oracle Cloud</div>
          </div>
          <div className="admin-stat-card revenue">
            <div className="admin-stat-label">💰 Total Revenue</div>
            <div className="admin-stat-val">${stats?.revenue?.toFixed(0) ?? "0"}</div>
            <div className="admin-stat-sub">Confirmed bookings only</div>
          </div>
        </div>

        {/* ── Kill Switch Panel ── */}
        <div className="admin-section-label">⚙️ Cloud Control (Demo)</div>
        <div className="admin-killswitch-panel">
          <div className="killswitch-info">
            <h3 className="killswitch-title">Simulate AWS Outage</h3>
            <p className="killswitch-desc">
              Click to simulate an AWS failure. All new traffic will automatically route to Oracle Cloud.
              Watch the monitoring graphs below update in real time.
            </p>
          </div>
          <div className="killswitch-controls">
            <div className={`killswitch-status-indicator ${awsSimDown ? "down" : "up"}`}>
              <span className={`ks-dot ${awsSimDown ? "offline" : "online"}`} />
              AWS: {awsSimDown ? "⚠️ SIMULATED DOWN" : "✅ OPERATIONAL"}
            </div>
            {!awsSimDown ? (
              <button className="killswitch-btn danger" onClick={() => setAwsSimDown(true)}>
                🔴 Simulate AWS Outage
              </button>
            ) : (
              <button className="killswitch-btn restore" onClick={() => setAwsSimDown(false)}>
                🟢 Restore AWS Instance
              </button>
            )}
          </div>
        </div>

        {/* ── Recent Bookings Table ── */}
        <div className="admin-section-label">📋 Recent Bookings</div>
        <div className="admin-bookings-table-wrap">
          <table className="admin-bookings-table">
            <thead>
              <tr>
                <th>#ID</th><th>Client</th><th>Room</th><th>Check-in</th>
                <th>Check-out</th><th>Nights</th><th>Cloud</th><th>Status</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", color: "#6b7280", padding: "24px" }}>No bookings yet</td></tr>
              ) : bookings.map((b) => (
                <tr key={b.id}>
                  <td className="admin-td-id">#{b.id}</td>
                  <td>{b.client_username}</td>
                  <td>{b.room_name}</td>
                  <td>{b.check_in}</td>
                  <td>{b.check_out}</td>
                  <td>{b.nights}</td>
                  <td>
                    <span className={`admin-cloud-badge ${b.served_by_cloud?.toLowerCase()}`}>
                      {b.served_by_cloud}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-status-badge ${b.status}`}>{b.status}</span>
                  </td>
                  <td className="admin-td-price">${b.total_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Existing Monitoring Dashboard ── */}
        <div className="admin-section-label">📊 Infrastructure Monitoring</div>
        <MonitoringDashboard awsSimDown={awsSimDown} />
      </div>
    </div>
  );
}
