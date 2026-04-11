import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const START_BLUE = "#1fb6fc";

// FadeMessage overlay, copy from your login page
function FadeMessage({ message, onDone, duration = 1000 }) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onDone) onDone();
    }, duration);
    return () => clearTimeout(timer);
  }, [onDone, duration]);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, width: "100vw", height: "100vh",
        zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none"
      }}
    >
      <div
        style={{
          background: "rgba(60, 60, 60, 0.94)",
          color: "#fff",
          borderRadius: 16,
          padding: "1.1rem 2.2rem",
          fontWeight: 600,
          fontSize: "1.19rem",
          boxShadow: "0 2px 16px 0 #0003",
          opacity: 0.97,
          textAlign: "center",
          minWidth: "140px",
          maxWidth: "80vw",
          textTransform: "none",
          letterSpacing: "0.01em",
          animation: "fade-in-out-anim 1s linear"
        }}
      >
        <span data-i18n={message}>{message}</span>
      </div>
      <style>
        {`
        @keyframes fade-in-out-anim {
          0% { opacity: 0; transform: scale(0.98);}
          10% { opacity: 1; transform: scale(1);}
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
        `}
      </style>
    </div>
  );
}

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fadeMsg, setFadeMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword !== confirmPassword) {
      const msg = "New passwords do not match";
      setErrorMsg(msg);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const BASE_URL = "https://stacks-admin.onrender.com";
      const res = await fetch(`${BASE_URL}/api/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token, // NOTE: lowercase 'x-auth-token'
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        const successMsg = "Password updated successfully!";
        setFadeMsg(successMsg);
        // Clear sensitive local data and force re-login
        localStorage.removeItem("currentUser");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      } else {
        setErrorMsg(data.message || "Password update failed.");
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg("Network error. Please try again.");
    }
  };

  // Handle fade success message, then redirect
  React.useEffect(() => {
    if (fadeMsg) {
      const timeout = setTimeout(() => {
        setFadeMsg("");
        navigate("/login");
      }, 1000); // 1s for fade, then redirect
      return () => clearTimeout(timeout);
    }
  }, [fadeMsg, navigate]);

  return (
    <div className="min-h-screen bg-white pb-20 flex items-center justify-center" style={{ alignItems: "flex-start" }}>
      {fadeMsg && <FadeMessage message={fadeMsg} />}
      <div className="w-full max-w-md">
        {/* Header - now flush to top, with blue back arrow */}
        <div
          className="bg-[#2d2d2d] text-white text-center py-3 font-semibold text-lg relative flex items-center justify-center"
          style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        >
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
          <span data-i18n="Update Password">Update Password</span>
        </div>
        <div className="bg-white shadow rounded-b px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Old Password"
              type="password"
              value={oldPassword}
              onChange={setOldPassword}
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            {errorMsg && (
              <div className="text-red-500 text-sm" data-i18n={errorMsg}>
                {errorMsg}
              </div>
            )}
            <button
              type="submit"
              className="w-full"
              style={{
                background: START_BLUE,
                color: "#fff",
                padding: "0.5rem",
                borderRadius: "0.375rem",
                fontWeight: 600,
                fontSize: "1rem",
                marginTop: "0.25rem",
                transition: "opacity 0.2s",
                opacity: loading ? 0.7 : 1,
                border: "none",
              }}
              disabled={loading}
            >
              <span data-i18n={loading ? "Updating..." : "Update"}>
                {loading ? "Updating..." : "Update"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Input({ label, type, value, onChange }) {
  return (
    <div>
      <label className="block mb-1 font-medium" data-i18n={label}>
        {label}
      </label>
      <input
        type={type}
        className="w-full border rounded px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
}
