import React from "react";
import { useNavigate } from "react-router-dom";

// Event images
import event1 from "../assets/images/events/event1.png";
import event2 from "../assets/images/events/event2.png";
import event3 from "../assets/images/events/Event4.png";

const START_BLUE = "#1fb6fc";

export default function Event() {
  const navigate = useNavigate();

  const eventImages = [event1, event2, event3];

  return (
    <div className="bg-white min-h-screen pb-6">
      {/* Top bar */}
      <div className="bg-[#2d2d2d] text-white flex items-center justify-between p-4">
        <button
          onClick={() => navigate(-1)}
          className="text-xl font-bold"
          aria-label="Back"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg width={28} height={28} viewBox="0 0 22 22">
            <polyline
              points="14,5 8,11 14,17"
              fill="none"
              stroke={START_BLUE}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="text-base font-semibold" data-i18n="Event">Event</div>
        <div className="w-6" /> {/* Placeholder to balance the layout */}
      </div>

      {/* Event images */}
      <div className="flex flex-col items-center gap-4 px-4 pt-4">
        {eventImages.map((img, i) => (
          <img
            key={i}
            src={img}
            alt={`Event ${i + 1}`}
            data-i18n-alt={`Event ${i + 1}`}
            className="w-full rounded-lg shadow-md"
          />
        ))}
      </div>
    </div>
  );
}
