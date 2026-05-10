import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import "./LandingPage.css";

const FEATURES = [
  { icon: "☁️", title: "Multi-Cloud Reliability", desc: "Your bookings run on AWS and Oracle Cloud simultaneously. If one goes down, the other takes over instantly." },
  { icon: "🔒", title: "Secure & Private", desc: "JWT-authenticated sessions, encrypted data, and role-based access control for every account." },
  { icon: "⚡", title: "Real-Time Availability", desc: "Live room availability powered by a shared cloud database. Book with confidence." },
  { icon: "📊", title: "Traffic Transparency", desc: "Every booking is tagged with the cloud that processed it. Full visibility, always." },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing">
      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-glow" />
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            Luxury Stays.<br />
            <span className="landing-hero-gradient">Always Available.</span>
          </h1>

          <div className="landing-hero-actions">
            {user ? (
              <Link to="/rooms" className="landing-cta-primary">Browse Rooms →</Link>
            ) : (
              <>
                <Link to="/register" className="landing-cta-primary">Get Started Free</Link>
                <Link to="/login" className="landing-cta-secondary">Sign In</Link>
              </>
            )}
          </div>

        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-features">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">Why CloudStay?</h2>
          <div className="landing-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="landing-feature-card">
                <div className="landing-feature-icon">{f.icon}</div>
                <h3 className="landing-feature-title">{f.title}</h3>

              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Footer ── */}
      <section className="landing-cta-section">
        <div className="landing-section-inner landing-cta-inner">
          <h2 className="landing-cta-title">Ready to book your stay?</h2>
          <p className="landing-cta-sub">Join CloudStay and experience the future of cloud-resilient hospitality.</p>
          <Link to="/register" className="landing-cta-primary large">Create Your Account →</Link>
        </div>
      </section>
    </div>
  );
}
