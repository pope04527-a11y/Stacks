import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const RENDER_BACKEND_URL = "https://stacks2-backend.onrender.com";

export default function NotificationBell() {
  const [unread, setUnread] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${RENDER_BACKEND_URL}/api/notifications`, {
      headers: { "X-Auth-Token": localStorage.getItem("authToken") }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setNotifications(data.notifications);
          const lastRead = Number(localStorage.getItem("lastReadNotificationId") || 0);
          setUnread(
            data.notifications.length > 0 &&
            data.notifications[0].id > lastRead
          );
        }
      });
  }, []);

  const handleBellClick = () => {
    if (notifications.length) {
      localStorage.setItem("lastReadNotificationId", notifications[0].id);
      setUnread(false);
    }
    navigate("/notifications");
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg
        onClick={handleBellClick}
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="#2196f3" /* Blue color */
        xmlns="http://www.w3.org/2000/svg"
        style={{ cursor: "pointer" }}
      >
        <path d="M12 22c1.1 0 2-.89 2-2h-4a2 2 0 002 2zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-1.7 1.7c-.14.14-.3.3-.3.6 0 .39.31.7.7.7h14c.39 0 .7-.31.7-.7 0-.3-.16-.46-.3-.6L18 16z"/>
      </svg>
      {unread && (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            width: 10,
            height: 10,
            background: "red",
            borderRadius: "50%",
            display: "inline-block"
          }}
        ></span>
      )}
    </div>
  );
}
