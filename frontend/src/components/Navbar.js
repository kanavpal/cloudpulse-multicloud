import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Don't show client nav on admin pages
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="cs-navbar">
      <div className="cs-navbar-inner">
        <Link to="/" className="cs-navbar-brand">
          <span className="cs-brand-icon">🏨</span>
          <span className="cs-brand-name">Cloud<span className="cs-brand-accent">Stay</span></span>
        </Link>

        <div className="cs-navbar-links">
          <Link to="/rooms" className={`cs-nav-link ${location.pathname === "/rooms" ? "active" : ""}`}>
            Browse Rooms
          </Link>
          {user && (
            <Link to="/my-bookings" className={`cs-nav-link ${location.pathname === "/my-bookings" ? "active" : ""}`}>
              My Bookings
            </Link>
          )}
        </div>

        <div className="cs-navbar-actions">
          {user ? (
            <>
              <span className="cs-navbar-user">👤 {user.username}</span>
              <button className="cs-btn-outline" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="cs-btn-outline">Login</Link>
              <Link to="/register" className="cs-btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
