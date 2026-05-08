import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import "./BookingPage.css";

const AWS_BASE = "http://52.206.184.80:8000";

export default function BookingPage() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [form, setForm] = useState({ check_in: "", check_out: "", guests: 1 });
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch(`${AWS_BASE}/api/rooms/${id}/`)
      .then((r) => r.json())
      .then(setRoom)
      .catch(() => navigate("/rooms"));
  }, [id, authFetch, navigate]);

  const nights = () => {
    if (!form.check_in || !form.check_out) return 0;
    const diff = new Date(form.check_out) - new Date(form.check_in);
    return Math.max(0, Math.floor(diff / 86400000));
  };

  const total = room ? (nights() * parseFloat(room.price_per_night)).toFixed(2) : "0.00";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nights() < 1) { setError("Check-out must be at least 1 night after check-in."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await authFetch(`${AWS_BASE}/api/bookings/`, {
        method: "POST",
        body: JSON.stringify({ room: parseInt(id), ...form, guests: parseInt(form.guests) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setConfirmed(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!room) return <div className="booking-loading"><div className="rooms-spinner" />Loading…</div>;

  if (confirmed) {
    return (
      <div className="booking-page">
        <div className="booking-confirmed">
          <div className="booking-confirmed-icon">✅</div>
          <h1 className="booking-confirmed-title">Booking Confirmed!</h1>
          <p className="booking-confirmed-sub">Your reservation has been secured.</p>
          <div className="booking-confirmed-card">
            <div className="bc-row"><span>Room</span><strong>{confirmed.room_name}</strong></div>
            <div className="bc-row"><span>Check-in</span><strong>{confirmed.check_in}</strong></div>
            <div className="bc-row"><span>Check-out</span><strong>{confirmed.check_out}</strong></div>
            <div className="bc-row"><span>Nights</span><strong>{confirmed.nights}</strong></div>
            <div className="bc-row"><span>Guests</span><strong>{confirmed.guests}</strong></div>
            <div className="bc-row"><span>Total</span><strong className="bc-total">${confirmed.total_price}</strong></div>
            <div className="bc-row bc-cloud-row">
              <span>Processed by</span>
              <strong className={`bc-cloud-badge ${confirmed.served_by_cloud?.toLowerCase()}`}>
                ☁️ {confirmed.served_by_cloud}
              </strong>
            </div>
            <div className="bc-row"><span>Booking ID</span><strong className="bc-id">#{confirmed.id}</strong></div>
          </div>
          <div className="booking-confirmed-actions">
            <button className="bc-btn-primary" onClick={() => navigate("/my-bookings")}>View My Bookings</button>
            <button className="bc-btn-outline" onClick={() => navigate("/rooms")}>Browse More Rooms</button>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="booking-page">
      <div className="booking-inner">
        <button className="booking-back" onClick={() => navigate("/rooms")}>← Back to Rooms</button>

        <div className="booking-layout">
          {/* Room summary */}
          <div className="booking-room-card">
            <img src={room.image_url} alt={room.name} className="booking-room-img"
              onError={(e) => { e.target.src = `https://picsum.photos/seed/${room.id}/600/400`; }} />
            <div className="booking-room-info">
              <span className="booking-room-type">{room.room_type}</span>
              <h2 className="booking-room-name">{room.name}</h2>
              <p className="booking-room-desc">{room.description}</p>
              <div className="booking-room-price">
                <span className="booking-price-num">${room.price_per_night}</span>
                <span className="booking-price-per"> / night</span>
              </div>
            </div>
          </div>

          {/* Booking form */}
          <div className="booking-form-card">
            <h3 className="booking-form-title">Complete Your Booking</h3>
            <form onSubmit={handleSubmit} className="booking-form">
              <div className="booking-field">
                <label className="booking-label">Check-in Date</label>
                <input className="booking-input" type="date" min={today} required
                  value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
              </div>
              <div className="booking-field">
                <label className="booking-label">Check-out Date</label>
                <input className="booking-input" type="date" min={form.check_in || today} required
                  value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
              </div>
              <div className="booking-field">
                <label className="booking-label">Guests</label>
                <input className="booking-input" type="number" min="1" max={room.capacity} required
                  value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} />
                <span className="booking-hint">Max {room.capacity} guests</span>
              </div>

              {nights() > 0 && (
                <div className="booking-summary">
                  <div className="bs-row"><span>Duration</span><span>{nights()} nights</span></div>
                  <div className="bs-row"><span>Rate</span><span>${room.price_per_night}/night</span></div>
                  <div className="bs-row bs-total"><span>Total</span><span>${total}</span></div>
                </div>
              )}

              {error && <div className="booking-error">⚠️ {error}</div>}

              <button className="booking-submit" type="submit" disabled={loading || nights() < 1}>
                {loading ? "Processing…" : `Confirm Booking — $${total}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
