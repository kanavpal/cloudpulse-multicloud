import React from "react";
import { Link } from "react-router-dom";
import "./RoomCard.css";

export default function RoomCard({ room }) {
  const typeColors = {
    standard: "#3b82f6",
    deluxe: "#8b5cf6",
    suite: "#f59e0b",
    family: "#10b981",
    villa: "#ef4444",
  };

  const color = typeColors[room.room_type] || "#6c63ff";

  return (
    <div className="room-card">
      <div className="room-card-img-wrap">
        <img
          src={room.image_url}
          alt={room.name}
          className="room-card-img"
          onError={(e) => {
            e.target.src = `https://picsum.photos/seed/${room.id}/800/500`;
          }}
        />
        <span className="room-card-type-badge" style={{ background: color }}>
          {room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)}
        </span>
      </div>

      <div className="room-card-body">
        <h3 className="room-card-name">{room.name}</h3>
        <p className="room-card-desc">{room.description}</p>

        <div className="room-card-amenities">
          {room.amenities.split(",").slice(0, 4).map((a) => (
            <span key={a} className="room-card-amenity">{a.trim()}</span>
          ))}
        </div>

        <div className="room-card-footer">
          <div className="room-card-capacity">👤 Up to {room.capacity} guests</div>
          <div className="room-card-price-wrap">
            <span className="room-card-price">${room.price_per_night}</span>
            <span className="room-card-per-night"> / night</span>
          </div>
        </div>

        <Link to={`/rooms/${room.id}/book`} className="room-card-book-btn">
          Book Now →
        </Link>
      </div>
    </div>
  );
}
