import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/images/header/logo.svg";
import CustomerServiceModal from "../components/CustomerServiceModal";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "./Login.css";
import { useProfile } from "../context/profileContext"; // <--- ensure profile is refreshed after login

// Reusable fading message overlay (grey, always centered)
function FadeMessage({ message, onDone, duration = 1000 }) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onDone) onDone();
    }, duration);
    return () => clearTimeout(timer);
  }, [onDone, duration]);
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
        {message}
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

// Simple spinner overlay for loading
function SpinnerOverlay({ duration = 500, onDone }) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onDone) onDone();
    }, duration);
    return () => clearTimeout(timer);
  }, [onDone, duration]);
  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, width: "100vw", height: "100vh",
        zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(245,247,251,0.75)",
        pointerEvents: "none"
      }}
    >
      <div className="spinner" style={{
        width: 44, height: 44, border: "4px solid #ddd", borderTop: "4px solid #216378",
        borderRadius: "50%", animation: "spin 0.8s linear infinite"
      }} />
      <style>
        {`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        `}
      </style>
    </div>
  );
}

const API_URL = "https://stacks-admin.onrender.com";

export default function Login({ refreshRecords }) {
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [fadeMsg, setFadeMsg] = useState("");
  const [showSpinner, setShowSpinner] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const navigate = useNavigate();
  const { fetchProfile } = useProfile(); // ensure we refresh canonical profile after login

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: input.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Robust token extraction: top-level token or data.user.token
        const token =
          data.token ||
          (data.user && (data.user.token || data.user?.token)) ||
          null;

        // persist token and basic user locally (store both keys for compatibility)
        if (token) {
          try { localStorage.setItem("authToken", token); } catch (e) {}
          try { localStorage.setItem("token", token); } catch (e) {}
        }

        if (data.user) {
          try { localStorage.setItem("currentUser", JSON.stringify(data.user)); } catch (e) {}
          try { localStorage.setItem("user", data.user.username || ""); } catch (e) {}
        }

        // Immediately refresh canonical profile so other pages show fresh data ASAP.
        // We await fetchProfile to increase chance the profile is present before navigation,
        // but even if it fails we continue (non-blocking for UX).
        try {
          if (typeof fetchProfile === "function") {
            await fetchProfile();
          }
        } catch (err) {
          console.warn("Post-login fetchProfile failed:", err);
        }

        // Notify other parts of the app that login happened (cross-tab and providers may listen)
        try { window.dispatchEvent(new Event("auth:login")); } catch (e) {}

        // Also signal profile updated if we have profile stored (profileContext will already dispatch),
        // but dispatching profile:refresh is harmless and triggers other listeners to revalidate.
        try { window.dispatchEvent(new Event("profile:refresh")); } catch (e) {}

        // Refresh task records if parent provided hook
        if (typeof refreshRecords === "function") {
          try {
            await refreshRecords();
          } catch (err) {
            // ignore
          }
        }

        setFadeMsg("Login Success");
      } else {
        setFadeMsg(data.message || "Login failed!");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setFadeMsg("Server error. Please try again later.");
    }
  };

  useEffect(() => {
    if (fadeMsg === "Login Success") {
      const timer = setTimeout(() => {
        setFadeMsg("");
        setShowSpinner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (fadeMsg && fadeMsg !== "Login Success") {
      const timer = setTimeout(() => setFadeMsg(""), 1000);
      return () => clearTimeout(timer);
    }
  }, [fadeMsg]);

  useEffect(() => {
    if (showSpinner) {
      const timer = setTimeout(() => {
        setShowSpinner(false);
        navigate("/dashboard");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showSpinner, navigate]);

  return (
    <div className="login-bg-hero flex items-center justify-center min-h-screen relative">
      {fadeMsg && (
        <FadeMessage message={fadeMsg} />
      )}
      {showSpinner && <SpinnerOverlay />}
      <div className="login-bg-overlay"></div>

      {/* LanguageSwitcher: fixed to the extreme top-right corner, scaled down for neat fit */}
      <div style={{
        position: "fixed",
        top: 8,
        right: 8,
        zIndex: 10050,
        transform: "scale(0.82)",
        transformOrigin: "top right",
        pointerEvents: "auto"
      }}>
        <LanguageSwitcher />
      </div>

      <div className="login-logo-absolute">
        <img
          src={logo}
          alt="Stacks Logo"
          className="login-logo-img login-logo-img-white"
          loading="lazy"
        />
      </div>
      <div className="login-content-centered z-10">
        <h2 className="login-title" data-i18n="Login Now">Login Now</h2>
        <form onSubmit={handleLogin} className="login-form">
          <div className="login-input-row">
            <label className="login-label" data-i18n="Username/Phone">Username/Phone</label>
            <div className="login-input-placeholder-wrap">
              <input
                name="username"
                type="text"
                className="login-input"
                placeholder="Username/Phone"
                data-i18n="Username/Phone"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                required
                autoComplete="username"
              />
              {!input && (
                <span className="login-placeholder right-align" data-i18n="Username/Phone">Username/Phone</span>
              )}
            </div>
          </div>
          <div className="login-input-row">
            <label className="login-label" data-i18n="Password">Password</label>
            <div className="login-input-placeholder-wrap">
              <input
                name="password"
                type="password"
                className="login-input"
                placeholder="Password"
                data-i18n="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              {!password && (
                <span className="login-placeholder right-align" data-i18n="Password">Password</span>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="login-btn"
            data-i18n="Login"
          >
            Login
          </button>
        </form>
        <div className="login-bottom-link">
          <Link to="/register" className="login-link" data-i18n="Register">
            Register
          </Link>
        </div>
      </div>

      <button
        type="button"
        className="customer-service-btn-top"
        title="Customer Service"
        onClick={() => setShowCustomerModal(true)}
        style={{
          position: "absolute",
          top: 35,
          right: 23,
          background: "none",
          border: "none",
          cursor: "pointer",
          zIndex: 30
        }}
      >
        <svg height="27" width="27" viewBox="0 0 24 24" fill="white">
          <path d="M12 12.713l-11.714-7.713v15h23.428v-15zm11.714-8.713h-23.428l11.714 7.713z"/>
        </svg>
      </button>
      <CustomerServiceModal open={showCustomerModal} onClose={() => setShowCustomerModal(false)} />
    </div>
  );
}
