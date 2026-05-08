import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../auth/authContext";
import "./MyBookingsPage.css";

const STATUS_COLORS = { confirmed: "#22c55e", cancelled: "#ef4444" };

export default function MyBookingsPage() {
  const { authFetch, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(() => {
    authFetch(`/api/bookings/`)
      .then((r) => r.json())
      .then((data) => { setBookings(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [authFetch]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this booking?")) return;
    await authFetch(`/api/bookings/${id}/cancel/`, { method: "POST" });
    fetchBookings();
  };

  return (
    <div className="mybookings-page">
      <div className="mybookings-inner">
        <div className="mybookings-header">
          <h1 className="mybookings-title">My Bookings</h1>
          <p className="mybookings-sub">Welcome back, <strong>{user?.username}</strong> — here are all your reservations.</p>
        </div>

        {loading ? (
          <div className="mybookings-loading"><div className="rooms-spinner" /><p>Loading bookings…</p></div>
        ) : bookings.length === 0 ? (
          <div className="mybookings-empty">
            <div className="mybookings-empty-icon">🛏️</div>
            <h3>No bookings yet</h3>
            <p>Browse our rooms and make your first booking!</p>
          </div>
        ) : (
          <div className="mybookings-list">
            {bookings.map((b) => (
              <div key={b.id} className="mybooking-card">
                <img src={b.room_image} alt={b.room_name} className="mybooking-img"
                  onError={(e) => { e.target.src = `https://picsum.photos/seed/${b.room}/200/150`; }} />
                <div className="mybooking-info">
                  <div className="mybooking-top">
                    <div>
                      <h3 className="mybooking-name">{b.room_name}</h3>
                      <span className="mybooking-type">{b.room_type}</span>
                    </div>
                    <span className="mybooking-status" style={{ color: STATUS_COLORS[b.status] }}>
                      ● {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </div>
                  <div className="mybooking-meta">
                    <span>📅 {b.check_in} → {b.check_out}</span>
                    <span>🌙 {b.nights} nights</span>
                    <span>👤 {b.guests} guests</span>
                    <span className={`mybooking-cloud ${b.served_by_cloud?.toLowerCase()}`}>☁️ {b.served_by_cloud}</span>
                  </div>
                  <div className="mybooking-footer">
                    <span className="mybooking-price">${b.total_price}</span>
                    <span className="mybooking-id">#{b.id}</span>
                    {b.status === "confirmed" && (
                      <button className="mybooking-cancel" onClick={() => handleCancel(b.id)}>Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
