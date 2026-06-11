import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/images/header/logo.svg";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "./Register.css";
// customer service modal
import CustomerServiceModal from "../components/CustomerServiceModal";
// import TermsAndConditions page (requested)
import TermsAndConditions from "./TermsAndConditions";

// Reusable grey fading message overlay (universal)
function GreyFadeMessage({ message, duration = 1000, onDone }) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onDone) onDone();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDone]);
  return (
    <div
      style={{
        position: "fixed",
        zIndex: 20000,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(245,247,251,0.95)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "#e6e6e6",
          color: "#222",
          borderRadius: "18px",
          padding: "1.2rem 2.5rem",
          fontWeight: 700,
          opacity: 0.96,
          fontSize: "1.18rem",
          boxShadow: "0 2px 16px 0 #0002",
          textAlign: "center",
          minWidth: "180px",
          letterSpacing: "0.01em",
          animation: "fade-in-out-register 1s linear",
        }}
      >
        {message}
      </div>
      <style>{`@keyframes fade-in-out-register { 0% { opacity: 0; transform: scale(0.98); } 10% { opacity: 1; transform: scale(1); } 90% { opacity: 1; } 100% { opacity: 0; } }`}</style>
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
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 20000,
        background: "rgba(245,247,251,0.90)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        className="spinner"
        style={{
          width: 44,
          height: 44,
          border: "4px solid #ddd",
          borderTop: "4px solid #216378",
          borderRadius: "50%",
          animation: "spin-register 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin-register { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ---- Updated: Use your custom API domain ----
const API_URL = "https://stacks-admin.onrender.com";

// Highlight color to match Male/Female (kept consistent)
const HIGHLIGHT_COLOR = "#1fb6fc";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    loginPassword: "",
    withdrawalPassword: "",
    password: "",
    confirmPassword: "",
    gender: "",
    inviteCode: "",
    agreed: false,
  });

  const [fadeMsg, setFadeMsg] = useState(""); // grey fading message
  const [showSpinner, setShowSpinner] = useState(false); // loading spinner

  // customer service modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // NEW: Terms modal state
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.agreed) {
      setFadeMsg("Please agree to the Terms and Conditions.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setFadeMsg("Passwords do not match.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          phone: formData.phone,
          loginPassword: formData.password,
          withdrawalPassword: formData.withdrawalPassword,
          gender: formData.gender,
          inviteCode: formData.inviteCode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Save user info to localStorage (like login does), then redirect
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        localStorage.setItem("user", data.user.username);
        localStorage.setItem("authToken", data.user.token);

        // Grey fading success, then spinner, then redirect (no message about redirecting)
        setFadeMsg("Register Success");
      } else {
        setFadeMsg(data.message || "Registration failed.");
      }
    } catch (err) {
      setFadeMsg("Server error. Please try again later.");
    }
  };

  // FadeMsg transitions to spinner if success, then navigate
  useEffect(() => {
    if (fadeMsg === "Register Success") {
      // after 1s, show spinner
      const timer = setTimeout(() => {
        setFadeMsg("");
        setShowSpinner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (fadeMsg && fadeMsg !== "Register Success") {
      // for other error/info messages, just hide after 1s
      const timer = setTimeout(() => setFadeMsg(""), 1000);
      return () => clearTimeout(timer);
    }
  }, [fadeMsg]);

  // When spinner is shown (after success), go to dashboard after 0.5s
  useEffect(() => {
    if (showSpinner) {
      const timer = setTimeout(() => {
        setShowSpinner(false);
        navigate("/dashboard");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showSpinner, navigate]);

  // NEW: open terms modal instead of navigating away
  const openTerms = (e) => {
    e.preventDefault();
    setShowTermsModal(true);
  };

  // When terms modal is open, prevent body scroll
  useEffect(() => {
    const prev = { overflow: document.body.style.overflow };
    if (showTermsModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev.overflow || "";
    }
    return () => {
      document.body.style.overflow = prev.overflow || "";
    };
  }, [showTermsModal]);

  return (
    <div className="register-bg-hero flex items-center justify-center min-h-screen relative">
      {fadeMsg && <GreyFadeMessage message={fadeMsg} />}
      {showSpinner && <SpinnerOverlay />}
      <div className="register-bg-overlay"></div>

      {/* LanguageSwitcher: fixed to the extreme top-right corner, scaled down for neat fit */}
      <div
        style={{
          position: "fixed",
          top: 8,
          right: 8,
          zIndex: 10050,
          transform: "scale(0.82)",
          transformOrigin: "top right",
          pointerEvents: "auto",
        }}
      >
        <LanguageSwitcher />
      </div>

      {/* Absolutely position the logo at the top center */}
      <div className="register-logo-absolute">
        <img src={logo} alt="Stacks Logo" className="register-logo-img register-logo-img-white" />
      </div>
      <div className="register-content-centered z-10">
        <h2 className="register-title" data-i18n="Register Now">
          Register Now
        </h2>
        <form className="register-form" onSubmit={handleRegister}>
          {/* Username */}
          <div className="register-input-row">
            <label className="register-label" data-i18n="Username">
              Username
            </label>
            <div className="register-input-placeholder-wrap">
              <input
                name="username"
                type="text"
                className="register-input"
                placeholder="Username"
                data-i18n="Username"
                value={formData.username}
                onChange={handleChange}
                required
                autoComplete="username"
              />
              {!formData.username && (
                <span className="register-placeholder right-align" data-i18n="Username">
                  Username
                </span>
              )}
            </div>
          </div>
          {/* Phone */}
          <div className="register-input-row">
            <label className="register-label" data-i18n="Phone">
              Phone
            </label>
            <div className="register-input-placeholder-wrap">
              <input
                name="phone"
                type="text"
                className="register-input"
                placeholder="Phone"
                data-i18n="Phone"
                value={formData.phone}
                onChange={handleChange}
                required
                autoComplete="tel"
              />
              {!formData.phone && (
                <span className="register-placeholder right-align" data-i18n="Phone">
                  Phone
                </span>
              )}
            </div>
          </div>
          {/* Withdrawal Password */}
          <div className="register-input-row">
            <label className="register-label" data-i18n="Withdrawal Password">
              Withdrawal Password
            </label>
            <div className="register-input-placeholder-wrap">
              <input
                name="withdrawalPassword"
                type="password"
                className="register-input"
                placeholder="Withdrawal Password"
                data-i18n="Withdrawal Password"
                value={formData.withdrawalPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              {!formData.withdrawalPassword && (
                <span className="register-placeholder right-align" data-i18n="Withdrawal Password">
                  Withdrawal Password
                </span>
              )}
            </div>
          </div>
          {/* Password */}
          <div className="register-input-row">
            <label className="register-label" data-i18n="Password">
              Password
            </label>
            <div className="register-input-placeholder-wrap">
              <input
                name="password"
                type="password"
                className="register-input"
                placeholder="Password"
                data-i18n="Password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              {!formData.password && (
                <span className="register-placeholder right-align" data-i18n="Password">
                  Password
                </span>
              )}
            </div>
          </div>
          {/* Confirm Password */}
          <div className="register-input-row">
            <label className="register-label" data-i18n="Confirm Password">
              Confirm Password
            </label>
            <div className="register-input-placeholder-wrap">
              <input
                name="confirmPassword"
                type="password"
                className="register-input"
                placeholder="Confirm Password"
                data-i18n="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              {!formData.confirmPassword && (
                <span className="register-placeholder right-align" data-i18n="Confirm Password">
                  Confirm Password
                </span>
              )}
            </div>
          </div>
          {/* Gender */}
          <div className="register-input-row register-gender-row">
            <label className="register-label" data-i18n="Gender">
              Gender
            </label>
            <div className="register-gender-group right-gender">
              <label className="register-radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={formData.gender === "Male"}
                  onChange={handleChange}
                  required
                />
                <span className="register-radio-text" data-i18n="Male" style={{ color: HIGHLIGHT_COLOR, fontWeight: 700 }}>
                  Male
                </span>
              </label>
              <label className="register-radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={formData.gender === "Female"}
                  onChange={handleChange}
                  required
                />
                <span className="register-radio-text" data-i18n="Female" style={{ color: HIGHLIGHT_COLOR, fontWeight: 700 }}>
                  Female
                </span>
              </label>
            </div>
          </div>
          {/* Invite Code */}
          <div className="register-input-row">
            <label className="register-label" data-i18n="Invite Code">
              Invite Code
            </label>
            <div className="register-input-placeholder-wrap">
              <input
                name="inviteCode"
                type="text"
                className="register-input"
                placeholder="Invite Code"
                data-i18n="Invite Code"
                value={formData.inviteCode}
                onChange={handleChange}
                required
                autoComplete="off"
              />
              {!formData.inviteCode && (
                <span className="register-placeholder right-align" data-i18n="Invite Code">
                  Invite Code
                </span>
              )}
            </div>
          </div>
          {/* Checkbox */}
          <div className="register-checkbox-row">
            <input
              type="checkbox"
              className="register-checkbox"
              name="agreed"
              checked={formData.agreed}
              onChange={handleChange}
              id="agreed"
            />
            <label htmlFor="agreed" className="register-checkbox-label" data-i18n="I agree with Terms and Conditions">
              I agree with{" "}
              {/* Make the words open modal TermsAndConditions page */}
              <a
                href="/terms"
                onClick={openTerms}
                className="register-link-terms"
                data-i18n="Terms and Conditions"
                style={{ color: HIGHLIGHT_COLOR, fontWeight: 700, textDecoration: "none", marginLeft: 6 }}
              >
                Terms and Conditions
              </a>
            </label>
          </div>
          <button type="submit" className="register-btn" data-i18n="Register">
            Register
          </button>
        </form>
        <div className="register-bottom-link">
          <Link to="/login" className="register-link" data-i18n="Back to Login">
            Back to Login
          </Link>
        </div>
      </div>

      {/* Moved chat/customer-service icon slightly down so it doesn't overlap the language switcher */}
      <button
        type="button"
        onClick={() => setShowCustomerModal(true)}
        className="customer-service-btn-top"
        title="Customer Service"
        style={{
          position: "absolute",
          top: 58, /* moved lower to clear language switcher */
          right: 23,
          background: "none",
          border: "none",
          cursor: "pointer",
          zIndex: 30,
        }}
      >
        <svg height="27" width="27" viewBox="0 0 24 24" fill="white">
          <path d="M12 12.713l-11.714-7.713v15h23.428v-15zm11.714-8.713h-23.428l11.714 7.713z" />
        </svg>
      </button>

      {/* Customer service modal */}
      <CustomerServiceModal open={showCustomerModal} onClose={() => setShowCustomerModal(false)} />

      {/* NEW: Terms & Conditions Modal */}
      {showTermsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Terms and Conditions"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 980,
              height: "90vh",
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 12px 50px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #eee" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Terms and Conditions</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowTermsModal(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid #ddd",
                    padding: "6px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Modal content area: render TermsAndConditions component inside a wrapper.
                We add a small override so the fixed header inside TermsAndConditions doesn't conflict.
                We keep this wrapper's overflow scrollable so the terms content can be read. */}
            <div style={{ flex: 1, overflow: "auto", position: "relative", background: "#fff" }} className="modal-root-terms">
              <style>
                {`
                  /* Hide the fixed top bar from TermsAndConditions when rendered inside this modal */
                  .modal-root-terms .fixed.top-0.left-0.right-0 { display: none !important; }
                  /* Adjust absolute content positioning from TermsAndConditions to flow naturally inside modal */
                  .modal-root-terms .absolute.top-16.bottom-0.left-0.right-0 {
                    position: relative !important;
                    top: 0 !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    height: auto !important;
                    overflow: visible !important;
                  }
                  /* Ensure internal paddings look good */
                  .modal-root-terms .absolute.top-16.bottom-0.left-0.right-0 > * {
                    padding: 18px !important;
                    background: transparent !important;
                  }
                `}
              </style>
              <div style={{ padding: 0 }}>
                <TermsAndConditions />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
