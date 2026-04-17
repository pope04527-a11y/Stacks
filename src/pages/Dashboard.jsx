import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// Header
import logo from "../assets/images/header/logo.svg";
import me from "../assets/images/header/me.png";
import NotificationBell from "../components/NotificationBell";
import LanguageSwitcher from "../components/LanguageSwitcher";

// Video banner
import bannerVideo from "../assets/videos/banner.mp4";

// Menu icons
import serviceIcon from "../assets/images/home/service1.png";
import eventIcon from "../assets/images/home/Event1.png";
import withdrawIcon from "../assets/images/home/Withdrawal1.png";
import depositIcon from "../assets/images/home/Deposit1.png";
import termsIcon from "../assets/images/home/T&C1.png";
import certificateIcon from "../assets/images/home/Certificate1.png";
import faqIcon from "../assets/images/home/FAQs1.png";

// VIP thumbs
import vip1 from "../assets/images/vip/vip1.png";
import vip2 from "../assets/images/vip/vip2.png";
import vip3 from "../assets/images/vip/vip3.png";
import vip4 from "../assets/images/vip/vip4.png";

// Tab bar icons
import homeIcon from "../assets/images/tabBar/homeh.png";
import taskIcon from "../assets/images/tabBar/icon30.png";
import recordsIcon from "../assets/images/tabBar/records.png";

// Import the customer service modal
import CustomerServiceModal from "../components/CustomerServiceModal";

// ---- Updated: Use your custom API domain ----
const API_URL = "https://stacks-admin.onrender.com";

// The blue used everywhere else
const START_BLUE = "#1fb6fc";

// Fix the modal so it's always centered and fully visible
function WithdrawPasswordModal({ open, onClose, onSubmit, withdrawPassword, setWithdrawPassword, errorMsg, submitting }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.45)",
        minHeight: "100vh",
        minWidth: "100vw",
        pointerEvents: "auto"
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-auto rounded-xl shadow-xl"
        style={{
          background: "#fff",
          pointerEvents: "auto",
          padding: "2rem 1.5rem 1.5rem 1.5rem",
          borderRadius: "18px",
          boxShadow: "0 2px 16px 0 #0002",
          maxWidth: 390,
          minWidth: 320,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <span className="text-[17px] font-semibold text-[#333]">{t("Withdrawal Password")}</span>
          <button
            className="ml-2 rounded-full text-gray-400 px-1.5 py-1 transition hover:text-gray-700"
            onClick={onClose}
            style={{
              fontSize: "1.25rem",
              background: "#f2f2f2",
              border: "none",
              lineHeight: 1,
            }}
            aria-label="Cancel"
          >
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <input
            type="password"
            placeholder={t("Withdrawal Password")}
            value={withdrawPassword}
            onChange={e => setWithdrawPassword(e.target.value)}
            className="w-full p-2 mb-3 border border-gray-200 rounded outline-none text-base"
            disabled={submitting}
            autoFocus
            style={{ background: "#f6f7fb" }}
          />
          {errorMsg && <div className="text-red-500 text-sm mb-2">{errorMsg}</div>}
          <button
            type="submit"
            className="w-full py-2 mt-1 rounded-full text-white font-semibold text-base"
            style={{
              background: START_BLUE,
              opacity: submitting ? 0.7 : 1,
              transition: "opacity 0.2s",
              boxShadow: `0 1px 8px ${START_BLUE}22`,
            }}
            disabled={submitting}
          >
            {submitting ? t("Verifying...") : t("Submit")}
          </button>
        </form>
      </div>
    </div>
  );
}

/*
  Lightweight, local dictionary-based i18n helper.
  Uses window.__TRANSLATIONS__ as populated by your initI18n loader.
*/
function getActiveLang() {
  return document.documentElement.getAttribute("lang") || localStorage.getItem("lang") || "en";
}

function getTranslations() {
  return (window && window.__TRANSLATIONS__) || {};
}

function useLangState() {
  const [lang, setLang] = useState(getActiveLang());
  useEffect(() => {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "lang") {
          setLang(getActiveLang());
        }
      }
    });
    obs.observe(document.documentElement, { attributes: true });
    return () => obs.disconnect();
  }, []);
  return [lang];
}

function t(key) {
  const lang = getActiveLang();
  const dict = getTranslations()[lang] || {};
  return dict[key] || key;
}

export default function Dashboard() {
  // ensure component updates when language changes
  const [, setRerender] = useState(0);
  useEffect(() => {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "lang") {
          // trigger a small rerender
          setRerender(r => r + 1);
        }
      }
    });
    obs.observe(document.documentElement, { attributes: true });
    return () => obs.disconnect();
  }, []);

  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [vipLevel, setVipLevel] = useState(0);
  const [showServiceModal, setShowServiceModal] = useState(false);

  // Withdrawal password modal states
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      // Fetch user profile from backend (with token header to avoid 403)
      // Prefer the global auth token key, fallback to token inside currentUser
      const token = localStorage.getItem("authToken") || parsedUser.token;
      fetch(`${API_URL}/api/user-profile`, {
        headers: {
          "x-auth-token": token
        }
      })
        .then((res) => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then((data) => {
          setBalance(data.user.balance || 0);
          setVipLevel(data.user.vipLevel || 0);
        })
        .catch((err) => {
          // silent
        });
    } else {
      alert("⚠️ Please login first.");
      navigate("/login");
    }
  }, [navigate]);

  // Open withdrawal password modal
  const handleWithdrawClick = () => {
    setWithdrawError("");
    setWithdrawPassword("");
    setShowWithdrawModal(true);
  };

  // Handle withdrawal password submit
  const submitWithdrawPassword = async (e) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawLoading(true);

    try {
      // Prefer the explicit auth token key used elsewhere in the app,
      // fallback to token stored in user object.
      const token = localStorage.getItem("authToken") || user?.token;
      if (!token) {
        setWithdrawLoading(false);
        setWithdrawError("Authentication required. Please log in.");
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/verify-withdraw-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({ password: withdrawPassword }),
      });

      // Handle explicit auth failures
      if (res.status === 401 || res.status === 403) {
        setWithdrawLoading(false);
        setWithdrawError("Not authorized. Please log in again.");
        navigate("/login");
        return;
      }

      const data = await res.json();
      setWithdrawLoading(false);
      if (data.success) {
        setShowWithdrawModal(false);
        setWithdrawPassword("");
        navigate("/withdraw");
      } else {
        setWithdrawError(data.message || "Incorrect withdrawal password.");
      }
    } catch (err) {
      setWithdrawLoading(false);
      setWithdrawError("Could not verify withdrawal password. Try again.");
    }
  };

  const menuItems = [
    { label: "Service", icon: serviceIcon, path: "/service" },
    { label: "Event", icon: eventIcon, path: "/events" },
    { label: "Withdrawal", icon: withdrawIcon, path: "/withdraw" },
    { label: "Deposit", icon: depositIcon, path: "/deposit" },
    { label: "T & C", icon: termsIcon, path: "/terms" },
    { label: "Certificate", icon: certificateIcon, path: "/certificate" },
    { label: "FAQs", icon: faqIcon, path: "/faq" },
  ];

  // Use stable translation keys instead of raw English sentences
  const vipCards = [
    {
      labelKey: "vip.1.title",
      icon: vip1,
      bgColor: "#3a6073",
      textKeys: [
        "vip.1.line1",
        "vip.1.line2",
        "vip.1.line3",
        "vip.1.line4",
        "vip.1.line5",
      ],
    },
    {
      labelKey: "vip.2.title",
      icon: vip2,
      bgColor: "#0056d2",
      textKeys: [
        "vip.2.line1",
        "vip.2.line2",
        "vip.2.line3",
        "vip.2.line4",
        "vip.2.line5",
      ],
    },
    {
      labelKey: "vip.3.title",
      icon: vip3,
      bgColor: "#f9a825",
      textKeys: [
        "vip.3.line1",
        "vip.3.line2",
        "vip.3.line3",
        "vip.3.line4",
        "vip.3.line5",
      ],
    },
    {
      labelKey: "vip.4.title",
      icon: vip4,
      bgColor: "#6a1b9a",
      textKeys: [
        "vip.4.line1",
        "vip.4.line2",
        "vip.4.line3",
        "vip.4.line4",
        "vip.4.line5",
      ],
    },
  ];

  const vipInfo = (() => {
    const raw = vipLevel;
    if (raw === undefined || raw === null) return { level: null, badge: null };
    let lvlNum = null;
    if (typeof raw === "number") lvlNum = raw;
    else if (typeof raw === "string") {
      const m = raw.match(/\d+/);
      lvlNum = m ? Number(m[0]) : NaN;
    } else {
      lvlNum = Number(raw);
    }
    if (!Number.isFinite(lvlNum)) return { level: null, badge: null };
    const level = Math.max(1, Math.min(4, Math.floor(lvlNum)));
    const map = { 1: vip1, 2: vip2, 3: vip3, 4: vip4 };
    const badge = map[level] || null;
    return { level, badge };
  })();

  if (!user) return null;

  return (
    <div className="bg-[#fefbf3] min-h-screen pb-24 relative">
      {/* Header */}
      <div className="flex justify-between items-center p-4 relative">
        <img src={logo} alt="Logo" className="h-6" />
        <div className="flex items-center gap-3">
          <NotificationBell />

          {/* LanguageSwitcher placed between the bell and profile icon so it scrolls with the page */}
          <div style={{ display: "flex", alignItems: "center", marginLeft: 6, marginRight: 6 }}>
            <LanguageSwitcher />
          </div>

          <Link to="/profile">
            <img
              src={me}
              alt="User"
              className="h-8 w-8 rounded-full cursor-pointer"
            />
          </Link>
        </div>
      </div>

      {/* Greeting */}
      <div className="px-4 text-[15px] mb-2 text-[#333] font-semibold">
        <span>{t("👋 Welcome back,")}</span> <span>{user.username}!</span>
      </div>

      {/* Video Banner */}
      <video
        className="w-full h-[220px] object-cover"
        src={bannerVideo}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Menu List */}
      <div className="bg-[#2d2d2d] px-4 py-4 mt-[-8px]">
        <div className="text-white text-sm font-semibold mb-3">
          <span>{t("Menu")}</span> <span className="text-[#00b0ff]">{t("List")}</span>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {menuItems.map((item, i) => {
            const menuContent = (
              <div className="flex flex-col items-center bg-[#404040] p-3 rounded-lg min-w-[72px] cursor-pointer">
                <img src={item.icon} alt={item.label} className="h-6 mb-1" />
                <span
                  className="text-xs text-center font-bold"
                  style={{ color: START_BLUE }}
                >
                  {t(item.label)}
                </span>
              </div>
            );

            // Service button opens modal, not route
            if (item.label === "Service") {
              return (
                <div key={i} onClick={() => setShowServiceModal(true)}>
                  {menuContent}
                </div>
              );
            }

            // Withdrawal button: show modal for withdrawal password (profile style)
            if (item.label === "Withdrawal") {
              return (
                <div key={i} onClick={handleWithdrawClick}>
                  {menuContent}
                </div>
              );
            }

            return (
              <div key={i} onClick={() => navigate(item.path)}>
                {menuContent}
              </div>
            );
          })}
        </div>
      </div>

      {/* Withdrawal Password Modal */}
      <WithdrawPasswordModal
        open={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onSubmit={submitWithdrawPassword}
        withdrawPassword={withdrawPassword}
        setWithdrawPassword={setWithdrawPassword}
        errorMsg={withdrawError}
        submitting={withdrawLoading}
      />

      {/* Customer Service Modal */}
      <CustomerServiceModal open={showServiceModal} onClose={() => setShowServiceModal(false)} />

      {/* VIP Levels */}
      <div className="bg-[#fefbf3] px-4 pt-5 pb-3">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[15px] font-semibold text-[#222]">{t("VIP Levels")}</h2>
          <div className="flex items-center" style={{ color: START_BLUE, fontWeight: 700 }}>
            {t("View More")} <span className="ml-1 text-lg">➤</span>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
          {vipCards.map((vip, idx) => (
            <div
              key={idx}
              className="rounded-lg p-4 w-[240px] text-white flex-shrink-0"
              style={{ backgroundColor: vip.bgColor }}
            >
              <div className="flex justify-center mb-2">
                <img src={vip.icon} alt={t(vip.labelKey)} className="h-10" />
              </div>
              <div className="text-center text-lg font-bold mb-2">
                {t(vip.labelKey)}
              </div>
              <ul className="text-sm space-y-1 leading-5">
                {vip.textKeys.map((k, i) => (
                  <li key={i}>● {t(k)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md border-t flex justify-around items-end py-2 z-10" style={{height: 64}}>
        <div
          className="flex flex-col items-center cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <img src={homeIcon} alt="Home" className="w-6 h-6 mb-1" />
          <span className="text-[11px] mt-1" style={{ color: START_BLUE }}>{t("Home")}</span>
        </div>

        <div
          className="flex flex-col items-center cursor-pointer"
          onClick={() => navigate("/tasks")}
          style={{ transform: "translateY(-10px)" }}
        >
          <img src={taskIcon} alt="Tasks" style={{ width: 56, height: 56, marginBottom: 2 }} />
          <span className="text-[1.13rem] font-bold mt-[-6px] text-gray-500">{t("Starting")}</span>
        </div>

        <div
          className="flex flex-col items-center cursor-pointer"
          onClick={() => navigate("/records")}
        >
          <img src={recordsIcon} alt="Records" className="w-6 h-6 mb-1" />
          <span className="text-[11px] text-gray-500 mt-1">{t("Records")}</span>
        </div>
      </div>
    </div>
  );
}
