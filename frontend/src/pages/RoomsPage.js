import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/authContext";
import RoomCard from "../components/RoomCard";
import "./RoomsPage.css";

const AWS_BASE = "http://52.206.184.80:8000";

export default function RoomsPage() {
  const { authFetch } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    authFetch(`${AWS_BASE}/api/rooms/`)
      .then((r) => r.json())
      .then((data) => { setRooms(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [authFetch]);

  const types = ["all", ...new Set(rooms.map((r) => r.room_type))];

  const filtered = rooms.filter((r) => {
    const matchType = filter === "all" || r.room_type === filter;
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="rooms-page">
      <div className="rooms-page-inner">
        <div className="rooms-header">
          <h1 className="rooms-title">Our Rooms</h1>
          <p className="rooms-sub">Choose from {rooms.length} handpicked accommodations across our cloud-resilient platform.</p>
        </div>

        <div className="rooms-filters">
          <input
            className="rooms-search"
            placeholder="🔍 Search rooms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="rooms-type-filters">
            {types.map((t) => (
              <button
                key={t}
                className={`rooms-type-btn ${filter === t ? "active" : ""}`}
                onClick={() => setFilter(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rooms-loading">
            <div className="rooms-spinner" />
            <p>Loading rooms…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rooms-empty">No rooms found matching your criteria.</div>
        ) : (
          <div className="rooms-grid">
            {filtered.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
