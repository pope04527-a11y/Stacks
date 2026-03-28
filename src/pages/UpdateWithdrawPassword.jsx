import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const START_BLUE = "#1fb6fc";

export default function UpdateWithdrawPassword() {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
      const BASE_URL = "https://stacks2-backend.onrender.com";
      const res = await fetch(`${BASE_URL}/api/change-withdraw-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": token,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setShowSuccess(true);
        setTimeout(() => {
          navigate("/profile");
        }, 4000);
      } else {
        setErrorMsg(data.message || "Withdrawal password update failed.");
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg("Network error. Please try again.");
    }
  };

  return (
    <div
      className="min-h-screen bg-white pb-20 flex items-center justify-center"
      style={{ alignItems: "flex-start" }}
    >
      <div className="w-full max-w-md">
        {/* Header - flush to top, blue back arrow */}
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
          <span data-i18n="Update Withdrawal Password">Update Withdrawal Password</span>
        </div>

        <div className="bg-white shadow rounded-b px-8 py-6">
          {showSuccess ? (
            <div className="text-center">
              <div className="text-green-600 font-semibold mb-4" data-i18n="Withdrawal password updated successfully!">
                Withdrawal password updated successfully!
                <br />
                <span data-i18n="Redirecting to profile...">Redirecting to profile...</span>
              </div>
              <div className="text-gray-400" data-i18n="You will be redirected in 4 seconds.">
                You will be redirected in 4 seconds.
              </div>
            </div>
          ) : (
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
          )}
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
