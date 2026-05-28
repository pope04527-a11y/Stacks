import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskRecords } from "../context/TaskRecordsContext";
import { useBalance } from "../context/balanceContext";
import { useToast } from "../context/ToastContext";
import "./Tasks.css";

import Header from "../components/Header";

// settings context for currency
import { useSettings } from "../context/SettingsContext";

import avatar from "../assets/images/profile/avatar.png";
import vip1 from "../assets/images/vip/vip1.png";
import vip2 from "../assets/images/vip/vip2.png";
import vip3 from "../assets/images/vip/vip3.png";
import vip4 from "../assets/images/vip/vip4.png";
import noticeIcon from "../assets/images/header/notification.png";
import homeIcon from "../assets/images/tabBar/homeh.png";
import startingIcon from "../assets/images/tabBar/icon30.png";
import recordsIcon from "../assets/images/tabBar/records.png";
import startButtonImg from "../assets/images/start/startbutton.png";

// --- CONFIG ---
// Primary source: static JSON exported to public/cloudinary-assets.json
const CLOUDINARY_ASSETS_API = "/cloudinary-assets.json"; // static JSON in public/
const CLOUDINARY_TAG = "products";
const CLOUDINARY_CLOUD_NAME = "dycytqdfj";
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/products/`; // fallback pattern
const imageStart = 42;
const imageEnd = 442;
const totalImages = imageEnd - imageStart + 1;

// DEFAULT_PRODUCT_IMAGE changed to an embedded SVG data-URI to avoid 404s if asset path missing
const DEFAULT_PRODUCT_IMAGE = 'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#f6f7fb"/><rect x="20" y="20" width="360" height="360" rx="36" fill="#fff" stroke="#eee" stroke-width="6"/></svg>');

// --- Utilities & UI components (preserve original behavior) ---

function Spinner({ size = 36, color = "#bbb", style = {} }) {
  return (
    <div
      style={{
        border: `3px solid #ececec`,
        borderTop: `3px solid ${color}`,
        borderRadius: "50%",
        width: size,
        height: size,
        animation: "spin 0.9s linear infinite",
        ...style,
      }}
    />
  );
}

function FadeOverlay({ show, children }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        zIndex: 11000,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(255,255,255,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "all",
        transition: "opacity 0.5s"
      }}
    >
      {children}
      <style>
        {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
}

function validateImageUrl(url, timeout = 2500) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const img = new Image();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      img.onload = img.onerror = null;
      resolve(ok);
    };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
    setTimeout(() => finish(false), timeout);
  });
}

async function filterValidImages(urls, timeout = 2500) {
  const checks = urls.map((url) =>
    validateImageUrl(url, timeout).then((ok) => (ok ? url : null))
  );
  const results = await Promise.all(checks);
  return results.filter(Boolean);
}

function OptimizingToast({ show }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "-60px",
        transform: "translateX(-50%)",
        background: "rgba(60,60,60,0.72)",
        color: "#fff",
        borderRadius: 13,
        padding: "7px 28px 7px 15px",
        fontWeight: 600,
        fontSize: 17,
        boxShadow: "0 2px 10px #0002",
        display: "flex",
        alignItems: "center",
        opacity: show ? 1 : 0,
        pointerEvents: "none",
        transition: "opacity 0.7s cubic-bezier(.4,0,.2,1)",
        zIndex: 10,
      }}
    >
      <Spinner size={22} color="#b2b2b2" style={{ marginRight: 10, filter: "blur(0.5px)" }} />
      <span data-i18n="Optimizing...">Optimizing...</span>
    </div>
  );
}

function GreyToast({ show, message }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        top: "22%",
        transform: "translateX(-50%)",
        background: "#eee",
        color: "#666",
        borderRadius: 10,
        padding: "10px 28px",
        fontWeight: 500,
        fontSize: 15.5,
        boxShadow: "0 2px 12px #0001",
        zIndex: 99999,
        minWidth: 210,
        maxWidth: "80vw",
        display: "flex",
        alignItems: "center",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          border: "3px solid #e0e0e0",
          borderTop: "3px solid #bbb",
          borderRadius: "50%",
          marginRight: 13,
          display: "inline-block",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span>{message}</span>
      <style>
        {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
}

const COMBO_TRIGGER_INDEX = 15;
const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

const vipConfig = { 1: { taskLimit: 40 }, 2: { taskLimit: 45 }, 3: { taskLimit: 50 }, 4: { taskLimit: 55 } };
const HEADER_HEIGHT = 64;
const BLACK_BG_HEIGHT = 322;
const START_BLUE = "#1fb6fc";
const BLACK_BG = "#181c23";

// --- Small helper: shuffle an array in-place and return it ---
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}

// --- Helper: try static JSON endpoint first ---
async function fetchAssetsFromStaticJson(max = 500) {
  try {
    const url = `${CLOUDINARY_ASSETS_API}`;
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
    const data = await resp.json();
    // Prefer thumb_url then secure_url then url
    const urls = (data.resources || []).map(r => r.thumb_url || r.secure_url || r.url).filter(Boolean);
    return urls.slice(0, max);
  } catch (err) {
    console.warn('Failed to fetch assets from static JSON:', err && (err.message || err));
    return null;
  }
}

// --- Fallback helpers ---
async function fetchCloudinaryTagList(tag = CLOUDINARY_TAG) {
  if (!tag) return null;
  const url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/list/${encodeURIComponent(tag)}.json`;
  try {
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) {
      throw new Error(`Tag list fetch failed: ${resp.status}`);
    }
    const data = await resp.json();
    const urls = (data.resources || []).map(r => r.secure_url || r.url).filter(Boolean);
    return urls;
  } catch (err) {
    console.warn("Failed to fetch Cloudinary tag list:", err);
    return null;
  }
}

function makeFallbackImageList() {
  return Array.from({ length: totalImages }, (_, i) => `${CLOUDINARY_BASE}product1_${i + imageStart}.jpg`);
}

// --- Component starts ---
const Tasks = () => {
  // Initialize grid from cache if present so boxes show immediately on navigation/reload
  const [productGrid, setProductGrid] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("productGridCache") || "null");
      if (Array.isArray(cached) && cached.length) {
        const firstNine = cached.slice(0, 9);
        while (firstNine.length < 9) firstNine.push(DEFAULT_PRODUCT_IMAGE);
        return firstNine;
      }
    } catch (e) {}
    return Array.from({ length: 9 }, () => DEFAULT_PRODUCT_IMAGE);
  });

  const [productGridCandidates, setProductGridCandidates] = useState([]);
  const [cloudinaryPool, setCloudinaryPool] = useState([]);

  const [currentTask, setCurrentTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [showOptimizingOverlay, setShowOptimizingOverlay] = useState(false);
  const [showOptimizingToast, setShowOptimizingToast] = useState(false);
  const [submitState, setSubmitState] = useState("");
  const [fadeSpinner, setFadeSpinner] = useState(false);
  const [greyToast, setGreyToast] = useState({ show: false, message: "" });

  const navigate = useNavigate();
  const {
    addTaskRecord,
    submitTaskRecord,
    hasPendingTask,
    hasPendingComboTask,
    records,
    fetchTaskRecords,
    setRecords,
  } = useTaskRecords();

  const {
    balance,
    setBalance,
    commissionToday,
    setCommissionToday,
    username,
    vipLevel,
    refreshProfile,
    userProfile
  } = useBalance();
  const { showToast } = useToast();

  const { currency } = useSettings();

  const productGridRef = useRef(productGrid);
  useEffect(() => { productGridRef.current = productGrid; }, [productGrid]);

  const validationRunIdRef = useRef(0);

  // New: local display copy of user data so we can immediately show updated backend values after login/profile refresh.
  // This mirrors context values and will be updated whenever context changes or a refresh completes.
  const [displayUser, setDisplayUser] = useState({
    username: username || "",
    balance: balance != null ? balance : 0,
    commissionToday: commissionToday != null ? commissionToday : 0,
  });

  // Helper: try fetching profile directly from backend using token(s) in localStorage
  // This uses the provided backend URL as a fallback when context refresh does not immediately provide data.
  const fetchProfileDirect = async () => {
    try {
      // Try several likely localStorage keys for the token
      const token =
        localStorage.getItem("x-auth-token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("X-Auth-Token") ||
        null;

      if (!token) return null;

      const resp = await fetch("https://stacksapp-backend.onrender.com/api/user-profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-auth-token": token
        },
        credentials: "include",
      });

      if (!resp.ok) return null;
      const body = await resp.json();
      // Accept common shapes: body.data, body.user, or body
      const profile = body && (body.data || body.user || body);
      if (!profile) return null;

      const newDisplay = {
        username: profile.username || profile.name || username || "",
        balance: profile.balance ?? profile.walletBalance ?? balance ?? 0,
        commissionToday: profile.commissionToday ?? profile.commission ?? commissionToday ?? 0,
      };
      setDisplayUser(newDisplay);

      // If the app's balance context functions are available, update them too for consistency.
      if (typeof setBalance === "function" && newDisplay.balance !== undefined) {
        setBalance(prev => (Number(newDisplay.balance) || Number(prev) || 0));
      }
      if (typeof setCommissionToday === "function" && newDisplay.commissionToday !== undefined) {
        setCommissionToday(prev => (Number(newDisplay.commissionToday) || Number(prev) || 0));
      }

      return profile;
    } catch (e) {
      return null;
    }
  };

  // When context values update (e.g., after refreshProfile), ensure the UI immediately reflects the latest backend values.
  useEffect(() => {
    setDisplayUser({
      username: username || (userProfile && userProfile.username) || "",
      balance: balance != null ? balance : (userProfile && userProfile.balance) || 0,
      commissionToday:
        commissionToday != null
          ? commissionToday
          : (userProfile && (userProfile.commissionToday ?? userProfile.commission)) || 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, balance, commissionToday, userProfile]);

  // Ensure profile & records are requested immediately when Tasks mounts or when an auth:login event occurs.
  useEffect(() => {
    // fire-and-forget immediate refresh so UI uses local cache but we pull canonical server state right away
    (async () => {
      try {
        const refreshed = await refreshProfile();
        // If refreshProfile returns the profile, use it immediately to update UI
        if (refreshed && typeof refreshed === "object") {
          setDisplayUser({
            username: refreshed.username || refreshed.name || username || "",
            balance: refreshed.balance ?? refreshed.walletBalance ?? balance ?? 0,
            commissionToday: refreshed.commissionToday ?? refreshed.commission ?? commissionToday ?? 0,
          });
        } else {
          // fallback: try direct fetch
          await fetchProfileDirect();
        }
      } catch (e) {
        // fallback: direct fetch
        await fetchProfileDirect();
      }
    })();

    if (typeof fetchTaskRecords === "function") fetchTaskRecords().catch(() => {});

    const onAuthLogin = () => {
      // when login occurs elsewhere, refresh immediately and update local display copy after the refresh
      (async () => {
        try {
          const refreshed = await refreshProfile();
          if (refreshed && typeof refreshed === "object") {
            setDisplayUser({
              username: refreshed.username || refreshed.name || username || "",
              balance: refreshed.balance ?? refreshed.walletBalance ?? balance ?? 0,
              commissionToday: refreshed.commissionToday ?? refreshed.commission ?? commissionToday ?? 0,
            });
          } else {
            // if refreshProfile doesn't return useful data, try direct fetch
            await fetchProfileDirect();
          }
          if (typeof fetchTaskRecords === "function") await fetchTaskRecords();
        } catch (e) {
          // best-effort fallback
          await fetchProfileDirect();
          if (typeof fetchTaskRecords === "function") fetchTaskRecords().catch(() => {});
        }
      })();
    };
    window.addEventListener("auth:login", onAuthLogin);

    // also respond to explicit profile:refresh events
    const onProfileRefresh = () => {
      (async () => {
        try {
          const refreshed = await refreshProfile();
          if (refreshed && typeof refreshed === "object") {
            setDisplayUser({
              username: refreshed.username || refreshed.name || username || "",
              balance: refreshed.balance ?? refreshed.walletBalance ?? balance ?? 0,
              commissionToday: refreshed.commissionToday ?? refreshed.commission ?? commissionToday ?? 0,
            });
          } else {
            await fetchProfileDirect();
          }
        } catch (e) {
          await fetchProfileDirect();
        }
      })();
    };
    window.addEventListener("profile:refresh", onProfileRefresh);

    return () => {
      window.removeEventListener("auth:login", onAuthLogin);
      window.removeEventListener("profile:refresh", onProfileRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load product pool and persist to localStorage so future navigations don't wait.
  // We keep the original reshuffle/validation behavior (loadValidatedProductGrid + 7s interval) intact.
  useEffect(() => {
    let cancelled = false;

    async function loadPool() {
      try {
        // Try static JSON first
        const fromStatic = await fetchAssetsFromStaticJson(1000);
        if (cancelled) return;
        if (fromStatic && fromStatic.length) {
          const shuffledPool = shuffle([...fromStatic]);
          setCloudinaryPool(shuffledPool);
          setProductGridCandidates(shuffledPool);
          try { localStorage.setItem("productGridCache", JSON.stringify(shuffledPool)); } catch (e) {}
          return;
        }

        // Tag list fallback
        const tagUrls = await fetchCloudinaryTagList(CLOUDINARY_TAG);
        if (cancelled) return;
        if (tagUrls && tagUrls.length) {
          const shuffledTagPool = shuffle([...tagUrls]);
          setCloudinaryPool(shuffledTagPool);
          setProductGridCandidates(shuffledTagPool);
          try { localStorage.setItem("productGridCache", JSON.stringify(shuffledTagPool)); } catch (e) {}
          return;
        }

        // final fallback pattern
        const fallback = makeFallbackImageList();
        const shuffledFallback = shuffle([...fallback]);
        setCloudinaryPool(shuffledFallback);
        setProductGridCandidates(shuffledFallback);
        try { localStorage.setItem("productGridCache", JSON.stringify(shuffledFallback)); } catch (e) {}
      } catch (err) {
        console.warn('Product pool load failed:', err);
      }
    }

    loadPool();

    return () => { cancelled = true; };
  }, []);

  // Original validated-grid + reshuffle behavior retained.
  const loadValidatedProductGrid = async (count = 9) => {
    const runId = ++validationRunIdRef.current;
    const pool = cloudinaryPool.length ? cloudinaryPool : productGridCandidates;
    setProductGridCandidates(pool);
    const candidates = pool.slice(0, Math.min(pool.length, 200));
    // validate candidate URLs quickly — keep same behavior as before
    const valid = await filterValidImages(candidates, 3000);
    const shuffledValid = shuffle([...valid]);
    let final = shuffledValid.slice(0, count);
    if (final.length < count) {
      const fill = [];
      for (let i = 0; i < count - final.length; i++) {
        if (valid.length > 0) {
          fill.push(valid[i % valid.length]);
        } else {
          fill.push(DEFAULT_PRODUCT_IMAGE);
        }
      }
      final = final.concat(fill);
    }
    if (runId === validationRunIdRef.current) {
      if (!arraysEqual(final, productGridRef.current)) setProductGrid(final);
    }
  };

  useEffect(() => {
    // run once immediately (preserves original behavior)
    loadValidatedProductGrid(9);
    // continue reshuffling every 7s as before
    const interval = setInterval(() => {
      loadValidatedProductGrid(9);
    }, 7000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudinaryPool]);

  // Defensive ensure grid always has 9 boxes (never collapse boxes)
  useEffect(() => {
    if (!Array.isArray(productGrid) || productGrid.length !== 9) {
      const out = Array.isArray(productGrid) ? productGrid.slice(0, 9) : [];
      while (out.length < 9) out.push(DEFAULT_PRODUCT_IMAGE);
      setProductGrid(out);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getCurrentTaskCountThisSet() {
    if (!records || !userProfile) return 0;
    const currentSet = userProfile.currentSet ?? 1;
    let comboTaskCodes = new Set();
    let count = 0;
    records.forEach(r => {
      if (
        r.status === "Completed" &&
        (r.set === currentSet || r.set === undefined)
      ) {
        if (r.isCombo) {
          if (r.taskCode && !comboTaskCodes.has(r.taskCode)) {
            count += 1;
            comboTaskCodes.add(r.taskCode);
          }
        } else {
          count += 1;
        }
      }
    });
    let pendingComboCodes = new Set();
    let hasPendingCombo = false;
    records.forEach(r => {
      if (
        r.status === "Pending" &&
        (r.set === currentSet || r.set === undefined)
      ) {
        if (r.isCombo) {
          if (r.taskCode && !pendingComboCodes.has(r.taskCode)) {
            hasPendingCombo = true;
            pendingComboCodes.add(r.taskCode);
          }
        } else {
          count += 1;
        }
      }
    });
    if (hasPendingCombo) count += 1;
    return count;
  }

  const maxTasks =
    (userProfile && userProfile.maxTasks) ||
    vipConfig[Number(vipLevel)]?.taskLimit ||
    40;
  const todaysTasks = getCurrentTaskCountThisSet();

  const showGreyToast = (message, duration = 1600) => {
    setGreyToast({ show: true, message });
    setTimeout(() => setGreyToast({ show: false, message: "" }), duration);
  };

  const handleStartTask = async () => {
    if (hasPendingTask() || hasPendingComboTask()) {
      showGreyToast("Please submit the previous rating before you proceed.");
      return;
    }

    if (todaysTasks >= maxTasks) {
      showGreyToast("Task set complete. Please contact customer service for reset.");
      return;
    }

    setOptimizing(true);
    setShowOptimizingOverlay(true);
    setShowOptimizingToast(true);

    const imageForTask = productGridRef.current && productGridRef.current.length
      ? productGridRef.current[Math.floor(productGridRef.current.length / 2)] || DEFAULT_PRODUCT_IMAGE
      : DEFAULT_PRODUCT_IMAGE;

    setTimeout(() => setShowOptimizingToast(false), 1150);

    try {
      const result = await addTaskRecord({ image: imageForTask });
      setOptimizing(false);
      setShowOptimizingOverlay(false);

      if (result && result.isCombo) {
        showGreyToast("Please submit the previous rating before you proceed.", 1800);
        setTimeout(() => {
          navigate("/deposit");
        }, 1800);
        return;
      }

      if (result && result.task) {
        // Show task modal immediately — do not wait for profile fetch
        const backendTask = result.task;
        if (!backendTask.product?.image) {
          backendTask.product = backendTask.product || {};
          backendTask.product.image = imageForTask;
        }
        setCurrentTask(backendTask);
        setShowModal(true);
        setSubmitState("");
        if (typeof backendTask.product?.price === "number") {
          setBalance(prev => Number(prev) - Number(backendTask.product.price));
        }

        // Refresh canonical profile & task records in background (do not block the UI)
        (async () => {
          try { await refreshProfile(); } catch (e) {}
          try { if (typeof fetchTaskRecords === "function") await fetchTaskRecords(); } catch (e) {}
          try { window.dispatchEvent(new Event("profile:refresh")); } catch (e) {}
          try { window.dispatchEvent(new Event("balance:changed")); } catch (e) {}
        })();

      } else {
        showGreyToast("Failed to start task. Please try again later.");
      }
    } catch (err) {
      setOptimizing(false);
      setShowOptimizingOverlay(false);
      showGreyToast("API error: " + (err.message || err));
    }
  };

  const handleSubmitTask = async () => {
    if (!currentTask) return;
    setSubmitState("submitting");

    try {
      const result = await submitTaskRecord(currentTask.taskCode);

      if (result && result.success) {
        setSubmitState("submitted");
        if (result.task) {
          const refund = Number(result.task.product?.price) || 0;
          const commission = Number(result.task.product?.commission) || 0;
          setCommissionToday(prev => commission + (Number(prev) || 0));
          setBalance(prev => Number(prev) + refund + commission);
          setRecords(prevRecords => {
            return prevRecords.map(r =>
              r.taskCode === result.task.taskCode
                ? { ...r, ...result.task }
                : r
            );
          });
        }

        // refresh canonical profile and records after submit (background)
        (async () => {
          try { await refreshProfile(); } catch (e) {}
          try { if (typeof fetchTaskRecords === "function") await fetchTaskRecords(); } catch (e) {}
          try { window.dispatchEvent(new Event("profile:refresh")); } catch (e) {}
          try { window.dispatchEvent(new Event("balance:changed")); } catch (e) {}
        })();

        setTimeout(() => {
          setShowModal(false);
          setCurrentTask(null);
          setSubmitState("");
          setFadeSpinner(true);
          setTimeout(() => {
            setFadeSpinner(false);
          }, 250);
        }, 250);
      } else {
        setSubmitState("");
        showGreyToast(result && result.message ? result.message : "Failed to submit task");
      }
    } catch (err) {
      setSubmitState("");
      showGreyToast("API error: " + (err.message || err));
    }
  };

  function getRandomProducts() {
    const pool = cloudinaryPool.length ? cloudinaryPool : productGridCandidates.length ? productGridCandidates : imageListFallback();
    const shuffled = shuffle([...pool]);
    return shuffled.slice(0, 9);
  }

  function imageListFallback() {
    return Array.from({ length: totalImages }, (_, i) => `${CLOUDINARY_BASE}product1_${i + imageStart}.jpg`);
  }

  const handleGridImgError = (e, index) => {
    const el = e.currentTarget;
    el.onerror = null;
    // if an image fails to load, keep the box visible and replace with a placeholder
    const pool = productGridRef.current && productGridRef.current.length ? productGridRef.current : productGridCandidates;
    let replacement = DEFAULT_PRODUCT_IMAGE;
    if (pool && pool.length) {
      for (let offset = 0; offset < pool.length; offset++) {
        const idx = (index + offset) % pool.length;
        const candidate = pool[idx];
        if (candidate && candidate !== el.src) {
          replacement = candidate;
          break;
        }
      }
    }
    el.src = replacement;
  };

  function renderTaskModal() {
    if (!currentTask) return null;
    const product = currentTask.product || {};
    const displayPrice = (() => {
      const candidate =
        product.price !== undefined && product.price !== null && product.price !== ""
          ? product.price
          : (currentTask?.product?.price ?? currentTask?.totalAmount ?? "");
      if (candidate === "" || candidate === null || candidate === undefined) return "";
      const num = Number(candidate);
      return !isNaN(num) ? num.toFixed(2) : String(candidate);
    })();

    const displayCommission = (() => {
      const c = product.commission ?? "";
      if (c === "" || c === null || c === undefined) return "";
      const num = Number(c);
      return !isNaN(num) ? num.toFixed(2) : String(c);
    })();

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-2" style={{fontFamily:"Arial,sans-serif"}}>
        <div
          className="w-full max-w-lg bg-white rounded-[18px] shadow-xl"
          style={{
            minWidth: 320,
            maxWidth: 460,
            borderRadius: 18,
            border: "none",
            boxShadow: "0 10px 40px #0002, 0 0 1px #0001",
            paddingBottom: 20
          }}
        >
          <div className="flex justify-between items-center mb-0 px-6 pt-6 pb-1">
            <div
              style={{
                fontWeight: 700,
                fontSize: 24,
                color: "#232323",
                letterSpacing: "0.01em"
              }}
              data-i18n="Task Submission"
            >
              Task Submission
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-500 text-2xl px-2 py-1 rounded hover:bg-gray-100"
              style={{ lineHeight: 1, background: "none", border: "none" }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="flex flex-row items-center px-6" style={{marginTop:6, marginBottom:10}}>
            <img
              src={product.image || DEFAULT_PRODUCT_IMAGE}
              alt="Product"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                objectFit: "cover",
                marginRight: 14,
                boxShadow: "0 2px 10px #0001"
              }}
            />
            <div style={{flex:1, minWidth:0}}>
              <div style={{
                fontWeight: 700,
                fontSize: 21.5,
                color: "#222",
                marginBottom: 2,
                letterSpacing: 0.01,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: "1.15"
              }}>
                {product.name}
              </div>
              <div style={{
                fontWeight: 700,
                fontSize: 19,
                color: "#222",
                marginBottom: 1,
                lineHeight: "1.12",
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
                <span style={{ color: BLACK_BG, fontWeight: 700, marginRight: 6 }}>{currency || ""}</span>
                <span
                  style={{ color: START_BLUE, fontWeight: 700 }}
                  title={displayPrice ? `${currency || ""} ${displayPrice}` : ""}
                >
                  {displayPrice}
                </span>
              </div>
              <div style={{
                margin: "2px 0 0 0",
                display: "flex",
                alignItems: "center"
              }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="21" height="21" viewBox="0 0 32 32" fill="#FFD700" style={{ marginRight: i < 4 ? 1 : 0 }}>
                    <polygon points="16,2 20,12 31,12.5 22,19 25,29 16,23.5 7,29 10,19 1,12.5 12,12" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
          <div style={{
            borderTop: "1px solid #ededed",
            margin: "3px 0 0 0"
          }} />
          <div style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            padding: "14px 8px 8px 8px"
          }}>
            <div style={{
              flex: 1,
              textAlign: "center"
            }}>
              <div style={{
                fontWeight: 700,
                fontSize: 17,
                color: "#6a6b72",
                marginBottom: 3
              }} data-i18n="Total Amount">Total Amount</div>
              <div style={{
                color: START_BLUE,
                fontWeight: 700,
                fontSize: 21.5,
                letterSpacing: ".01em",
                display: "flex",
                justifyContent: "center",
                alignItems: "baseline",
                gap: 8
              }}>
                <span style={{ color: BLACK_BG, fontWeight: 700 }}>{currency || ""}</span>
                <span>{displayPrice}</span>
              </div>
            </div>
            <div style={{
              flex: 1,
              textAlign: "center"
            }}>
              <div style={{
                fontWeight: 700,
                fontSize: 17,
                color: "#6a6b72",
                marginBottom: 3
              }} data-i18n="Commission">Commission</div>
              <div style={{
                color: START_BLUE,
                fontWeight: 700,
                fontSize: 21.5,
                letterSpacing: ".01em",
                display: "flex",
                justifyContent: "center",
                alignItems: "baseline",
                gap: 8
              }}>
                <span style={{ color: BLACK_BG, fontWeight: 700 }}>{currency || ""}</span>
                <span>{displayCommission}</span>
              </div>
            </div>
          </div>
          <div style={{
            borderTop: "1px solid #ededed",
            margin: "0 0 0 0"
          }} />
          <div style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            padding: "13px 28px 0 28px",
            fontSize: 14.5,
            fontWeight: 500,
            color: "#222",
            letterSpacing: "0.01em"
          }}>
            <div data-i18n="Created At">Created At</div>
            <div style={{ fontWeight: 700 }}>
              {formatDate(product.createdAt || currentTask.createdAt)}
            </div>
          </div>
          <div style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 28px 0 28px",
            fontSize: 14.5,
            fontWeight: 500,
            color: "#222",
            letterSpacing: "0.01em"
          }}>
            <div data-i18n="Task Code">Task Code</div>
            <div style={{
              fontWeight: 700,
              color: START_BLUE,
              fontFamily: "monospace",
              fontSize: 15.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "63vw",
              textTransform: "uppercase"
            }}>
              {currentTask.taskCode}
            </div>
          </div>
          <div style={{ padding: "0 28px 0 28px", marginTop: 18 }}>
            <button
              onClick={submitState === "" ? handleSubmitTask : undefined}
              disabled={submitState !== ""}
              className="mt-2 w-full py-2 text-white rounded-full font-semibold text-lg"
              style={{
                background: START_BLUE,
                opacity: 1,
                transition: "opacity 0.2s",
                boxShadow: `0 1px 8px ${START_BLUE}22`,
                borderRadius: "18px",
                fontSize: "1.18rem",
                marginTop: 2
              }}
            >
              {submitState === "submitting" ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Spinner size={24} style={{ marginRight: 9 }} color={START_BLUE} />
                  <span data-i18n="Submitting...">Submitting...</span>
                </span>
              ) : submitState === "submitted" ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Spinner size={24} style={{ marginRight: 9 }} color={START_BLUE} />
                  <span data-i18n="Submitted!">Submitted!</span>
                </span>
              ) : (
                <span data-i18n="Submit">Submit</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderProductGrid = () => (
    <div className="product-grid-responsive-side-space">
      {productGrid.map((src, index) => (
        <div
          key={index}
          className={
            index === 4
              ? "product-item product-item-center-circular"
              : "product-item"
          }
        >
          {index === 4 ? (
            <div className="flex items-center justify-center w-full h-full" style={{ position: "relative" }}>
              <OptimizingToast show={showOptimizingToast} />
              <button
                className={`start-button-circular${optimizing ? " rotating" : ""}`}
                onClick={optimizing ? undefined : handleStartTask}
                disabled={optimizing}
                style={{
                  background: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  padding: 0,
                  width: "90%",
                  height: "90%",
                  aspectRatio: "1/1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 2px 12px ${START_BLUE}22`,
                  cursor: optimizing ? "wait" : "pointer",
                  position: "relative",
                  overflow: "hidden",
                  margin: "auto",
                  transition: "box-shadow 0.18s"
                }}
              >
                <img
                  src={startButtonImg}
                  alt="Start"
                  style={{
                    width: "78%",
                    height: "78%",
                    objectFit: "contain",
                    borderRadius: "50%",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
              </button>
            </div>
          ) : (
            <img
              src={src || DEFAULT_PRODUCT_IMAGE}
              alt={`product-${index}`}
              loading="lazy"
              onError={(e) => handleGridImgError(e, index)}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }}
            />
          )}
        </div>
      ))}
      <style>
        {`
        .product-grid-responsive-side-space {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 32px;
          max-width: 900px;
          margin: 0 auto;
          margin-top: 0;
          padding: 0 10px;
        }
        .product-item {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 2px 16px #0001;
          overflow: hidden;
          aspect-ratio: 1/1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 90px;
          min-height: 90px;
          max-width: 240px;
          max-height: 240px;
        }
        .product-item-center-circular {
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 16px #0002;
          overflow: visible;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .start-button-circular {
          transition: box-shadow 0.18s;
        }
        .start-button-circular.rotating {
          animation: start-rotate 1.1s linear infinite;
        }
        @keyframes start-rotate {
          100% { transform: rotate(360deg);}
        }
        .start-button-circular:disabled {
          opacity: 0.7;
        }
        .product-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 16px;
        }
        @media (max-width: 700px) {
          .product-grid-responsive-side-space {
            gap: 5vw;
            padding-left: 6vw;
            padding-right: 6vw;
          }
        }
        @media (max-width: 520px) {
          .product-grid-responsive-side-space {
            gap: 4vw;
            padding-left: 10vw;
            padding-right: 10vw;
          }
        }
        @media (max-width: 400px) {
          .product-grid-responsive-side-space {
            gap: 2vw;
            padding-left: 7vw;
            padding-right: 7vw;
          }
        }
        `}
      </style>
    </div>
  );

  const getVipBadgeInfo = () => {
    const raw = vipLevel ?? userProfile?.vipLevel;
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
  };

  const vipInfo = getVipBadgeInfo();

  const fmtNum = (v) => {
    const n = Number(v || 0);
    if (!Number.isFinite(n)) return "";
    return n.toFixed(2);
  };

  return (
    <div className="min-h-screen pb-20 bg-[#f5f5f5] relative">
      <Header />

      <div
        style={{
          width: "100vw",
          left: 0,
          top: HEADER_HEIGHT,
          position: "absolute",
          zIndex: 0,
          background: BLACK_BG,
          height: BLACK_BG_HEIGHT,
        }}
      />

      <div className="bg-transparent text-white p-4 flex items-center justify-between relative" style={{ zIndex: 1 }}>
        <div className="flex items-center gap-3">
          <img src={avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
          <div>
            <div className="font-semibold text-sm">
              <span data-i18n="Hi,">Hi,</span> {displayUser.username} <span aria-hidden>👏</span>
            </div>
          </div>
        </div>
        {vipInfo.badge ? (
          <img src={vipInfo.badge} alt={`VIP-${vipInfo.level}`} className="h-7" />
        ) : vipInfo.level ? (
          <div style={{ color: "#fff", fontWeight: 700 }}>VIP{vipInfo.level}</div>
        ) : (
          <img src={vip2} alt="VIP" className="h-7" />
        )}
      </div>

      <div className="p-4 relative" style={{ zIndex: 2 }}>
        <div className="bg-white rounded-lg shadow p-4 mb-3 flex justify-between items-center">
          <div>
            <div className="font-semibold text-sm" data-i18n="Total Balance">Total Balance</div>
            <div className="text-xs text-gray-500" data-i18n="Profits will be added here">Profits will be added here</div>
          </div>
          <div className="text-right font-bold" style={{ color: START_BLUE }}>
            <span style={{ color: START_BLUE }}>{fmtNum(displayUser.balance)}</span>{" "}
            <span style={{ color: BLACK_BG, fontWeight: 700 }}>{currency || ""}</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 mb-3 flex justify-between items-center">
          <div>
            <div className="font-semibold text-sm" data-i18n="Today's Commission">Today's Commission</div>
            <div className="text-xs text-gray-500" data-i18n="Auto reset at 00:00 daily">Auto reset at 00:00 daily</div>
          </div>
          <div className="text-right font-bold" style={{ color: START_BLUE }}>
            <span style={{ color: START_BLUE }}>{fmtNum(displayUser.commissionToday)}</span>{" "}
            <span style={{ color: BLACK_BG, fontWeight: 700 }}>{currency || ""}</span>
          </div>
        </div>
      </div>

      <div
        className="px-4 text-sm font-semibold flex justify-between items-center mb-2 relative"
        style={{ zIndex: 3 }}
      >
        <span style={{ color: START_BLUE, textShadow: "0 1px 8px #212", fontWeight: 600 }} data-i18n="Start Optimization">
          Start Optimization
        </span>
        <span style={{ color: START_BLUE, fontWeight: 700 }} id="tasksProgress">
          {todaysTasks}/{maxTasks}
        </span>
      </div>

      <div style={{ zIndex: 3, position: "relative" }}>
        {renderProductGrid()}
      </div>

      <div className="bg-white mx-4 mt-4 p-3 rounded-lg shadow text-sm relative" style={{ zIndex: 3 }}>
        <div className="flex items-center gap-2 font-semibold mb-1">
          <img src={noticeIcon} alt="Notice" className="w-4 h-4" />
          <span data-i18n="Notice">Notice</span>
        </div>
        <p className="text-xs text-gray-600" data-i18n="Online Support Hours Time 10:00–21:59">Online Support Hours Time 10:00–21:59</p>
      </div>

      {showModal && renderTaskModal()}

      <FadeOverlay show={fadeSpinner}>
        <Spinner size={44} color={START_BLUE} />
      </FadeOverlay>
      <GreyToast show={greyToast.show} message={greyToast.message} />

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-end py-2 z-40" style={{height: 64}}>
        <div
          className="flex flex-col items-center text-xs cursor-pointer"
          style={{ color: "#8fadc7" }}
          onClick={() => navigate("/dashboard")}
        >
          <img src={homeIcon} alt="Home" className="w-6 h-6 mb-1" />
          <span data-i18n="Home">Home</span>
        </div>
        <div
          className="flex flex-col items-center text-xs font-semibold cursor-pointer"
          style={{ color: START_BLUE, transform: "translateY(-10px)" }}
        >
          <img
            src={startingIcon}
            alt="Starting"
            style={{
              width: 56,
              height: 56,
              marginBottom: 2
            }}
          />
          <span data-i18n="Starting" style={{ fontSize: "1.13rem", fontWeight: 700, marginTop: -6 }}>Starting</span>
        </div>
        <div
          className="flex flex-col items-center text-xs cursor-pointer"
          style={{ color: "#8fadc7" }}
          onClick={() => navigate("/records")}
        >
          <img src={recordsIcon} alt="Records" className="w-6 h-6 mb-1" />
          <span data-i18n="Records">Records</span>
        </div>
      </div>
    </div>
  );
};

// Helper for formatting date -- keep signature as expected
function formatDate(dateValue) {
  if (!dateValue) return "";
  try {
    const date = typeof dateValue === "string" || typeof dateValue === "number" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (e) {
    return "";
  }
}

export default Tasks;
