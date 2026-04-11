import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "https://stacks-admin.onrender.com";
const START_BLUE = "#1fb6fc";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/notifications`, {
      headers: {
        "X-Auth-Token": localStorage.getItem("authToken"),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNotifications(data.notifications);
          // Mark all as read: store latest ID
          if (data.notifications.length > 0) {
            localStorage.setItem(
              "lastReadNotificationId",
              data.notifications[0].id
            );
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-[#2d2d2d] text-white text-center py-3 font-semibold text-lg relative flex items-center justify-center">
        <button
          aria-label="Back"
          data-i18n-aria="Back"
          onClick={() => navigate(-1)}
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            lineHeight: 1,
            zIndex: 1,
            display: "flex",
            alignItems: "center"
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
        <span data-i18n="Notifications">Notifications</span>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="text-center text-gray-500" data-i18n="Loading...">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center text-gray-400" data-i18n="No notifications at the moment.">
            No notifications at the moment.
          </div>
        ) : (
          <ul className="space-y-4">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="border rounded p-4 shadow-sm bg-gray-50"
              >
                <div className="font-semibold" style={{ color: START_BLUE }}>{n.title}</div>
                <div className="mt-1 text-gray-700">{n.message}</div>
                <div className="mt-2 text-xs text-gray-400">
                  {n.createdAt && !isNaN(new Date(n.createdAt).getTime())
                    ? new Date(n.createdAt).toLocaleString()
                    : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
