import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const START_BLUE = "#1fb6fc";

// Use your API backend URL here!
const BACKEND_API = "https://stacks-admin.onrender.com/api";

export default function BindWallet() {
  const [fullName, setFullName] = useState("");
  const [exchange, setExchange] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [user, setUser] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      alert("Please login first.");
      navigate("/login");
    }
  }, [navigate]);

  // Load the existing wallet details if they exist
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setExchange(user.exchange || "");
      setWalletAddress(user.walletAddress || user.wallet || "");
    }
  }, [user]);

  const handleUpdate = async () => {
    if (!walletAddress.trim()) return;
    setLoading(true);

    try {
      const token = user.token;
      const res = await fetch(`${BACKEND_API}/bind-wallet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({
          fullName,
          exchange,
          walletAddress,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        // Update local user as well
        const updatedUser = {
          ...user,
          fullName,
          exchange,
          walletAddress,
        };
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setShowToast(true);
        setTimeout(() => {
          navigate("/profile");
        }, 1500);
      } else {
        alert(data.message || "Failed to update wallet address.");
      }
    } catch (err) {
      setLoading(false);
      alert("Failed to update wallet address.");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white relative">
      {/* Header */}
      <div className="bg-[#2d2d2d] text-white py-3 px-4 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="mr-3"
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
          aria-label="Back"
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
        <span className="font-semibold text-lg" data-i18n="Bind Wallet Address">
          Bind Wallet Address
        </span>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        <div>
          <label className="font-semibold text-sm block mb-1" data-i18n="Full Name">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
            data-i18n-placeholder="Full Name"
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        <div>
          <label className="font-semibold text-sm block mb-1" data-i18n="Exchange">
            Exchange
          </label>
          <input
            type="text"
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            placeholder="Exchange"
            data-i18n-placeholder="Exchange"
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        <div>
          <label className="font-semibold text-sm block mb-1" data-i18n="Wallet Address">
            Wallet Address
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Wallet Address"
            data-i18n-placeholder="Wallet Address"
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        <button
          onClick={handleUpdate}
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
      </div>

      {/* Toast Message */}
      {showToast && (
        <div
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-sm px-4 py-2 rounded shadow-lg transition-opacity duration-300"
          role="status"
        >
          <span data-i18n="✅ Wallet updated successfully!">✅ Wallet updated successfully!</span>
        </div>
      )}
    </div>
  );
}
