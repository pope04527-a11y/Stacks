import React, { useEffect, useState } from "react";

// Path to your avatar image in the public folder
const csImage = "/assets/images/Cs.jpg";

export default function CustomerServiceModal({ open, onClose }) {
  const [links, setLinks] = useState({
    telegram1: "",
    telegram2: "",
    customerService: "",
  });

  useEffect(() => {
    if (!open) return;
    fetch("https://stacks2-backend.onrender.com/service-links.json?ts=" + Date.now())
      .then((res) => res.json())
      .then((data) => {
        setLinks({
          telegram1: data.telegram1 || "",
          telegram2: data.telegram2 || "",
          customerService: data.whatsapp || "",
        });
      })
      .catch(() => {
        setLinks({ telegram1: "", telegram2: "", customerService: "" });
      });
  }, [open]);

  if (!open) return null;

  // Blue arrow icon
  const arrowIcon = (
    <svg width="20" height="20" viewBox="0 0 18 18" style={{ marginLeft: "auto" }}>
      <path
        d="M6 4l4 5-4 5"
        stroke="#198cff"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );

  // Avatar used for all rows
  const avatar = (
    <img
      src={csImage}
      alt="service"
      data-i18n-alt="service"
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        marginRight: 14,
        objectFit: "cover",
        background: "#eee",
        border: "1px solid #eee",
      }}
    />
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        background: "rgba(30, 32, 38, 0.30)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.2s",
      }}
      onClick={onClose}
    >
      {/* Modal box */}
      <div
        style={{
          background: "rgba(252, 252, 255, 0.98)",
          borderRadius: 20,
          boxShadow: "0 8px 32px 0 rgba(0,0,0,0.14)",
          minWidth: 340,
          maxWidth: "95vw",
          minHeight: 80,
          padding: "0",
          textAlign: "left",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          border: "1.5px solid #f0f1f3",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "8px 0" }}>
          {/* Telegram 1 */}
          <button
            onClick={() => {
              if (links.telegram1) {
                window.open(links.telegram1, "_blank");
                onClose();
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              background: "none",
              border: "none",
              padding: "12px 28px 12px 22px",
              cursor: links.telegram1 ? "pointer" : "not-allowed",
              opacity: links.telegram1 ? 1 : 0.5,
              fontSize: 18,
              fontWeight: 600,
              color: "#43444a",
              borderBottom: "1px solid #ececec",
              outline: "none",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            disabled={!links.telegram1}
          >
            {avatar}
            <span data-i18n="Telegram">Telegram</span>
            {arrowIcon}
          </button>

          {/* Telegram 2 */}
          <button
            onClick={() => {
              if (links.telegram2) {
                window.open(links.telegram2, "_blank");
                onClose();
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              background: "none",
              border: "none",
              padding: "12px 28px 12px 22px",
              cursor: links.telegram2 ? "pointer" : "not-allowed",
              opacity: links.telegram2 ? 1 : 0.5,
              fontSize: 18,
              fontWeight: 600,
              color: "#43444a",
              borderBottom: "1px solid #ececec",
              outline: "none",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            disabled={!links.telegram2}
          >
            {avatar}
            <span data-i18n="Telegram">Telegram</span>
            {arrowIcon}
          </button>

          {/* Customer Service */}
          <button
            onClick={() => {
              const username = localStorage.getItem("user");

              if (!username) {
                // kept original alert text; translator may replace visible UI strings.
                alert("Username not found — user must be logged in.");
                return;
              }

              const chatUrl = `https://stacks-chat.onrender.com/?user=${username}`;
              window.open(chatUrl, "_blank");
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              background: "none",
              border: "none",
              padding: "12px 28px 12px 22px",
              cursor: "pointer",
              opacity: 1,
              fontSize: 18,
              fontWeight: 600,
              color: "#43444a",
              outline: "none",
              textAlign: "left",
              transition: "background 0.15s",
            }}
          >
            {avatar}
            <span data-i18n="Customer Service">Customer Service</span>
            {arrowIcon}
          </button>
        </div>

        {/* Cancel link inside modal */}
        <div
          style={{
            textAlign: "center",
            padding: "10px 0 8px 0",
            borderTop: "1px solid #ececec",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#198cff",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline",
              letterSpacing: 0.2,
              outline: "none",
              transition: "color 0.18s",
            }}
          >
            <span data-i18n="Cancel">Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
