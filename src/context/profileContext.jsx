import React, { createContext, useContext, useEffect, useRef, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "https://stacks-admin.onrender.com";

const ProfileContext = createContext({
  profile: null,
  fetchProfile: async () => null,
  setProfile: () => {},
  isLoading: false,
});

//
// Resilient helper: fetch profile from server with timeout + one retry.
// Accepts token (session token) and uses X-Auth-Token or Authorization Bearer header.
//
async function fetchProfileFromServer(token, timeoutMs = 3000, attempt = 1) {
  if (!token) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      "Content-Type": "application/json",
      // Prefer X-Auth-Token for your API; also include Authorization fallback.
      "X-Auth-Token": token,
      Authorization: `Bearer ${token}`,
    };

    const resp = await fetch(`${API_URL}/api/user-profile`, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    // If server rejects the token, proactively clear local auth and notify app
    if (resp.status === 401 || resp.status === 403) {
      try {
        // remove local stored tokens/profile so client stops sending dead token
        localStorage.removeItem("authToken");
        localStorage.removeItem("token");
        localStorage.removeItem("userProfile");
        localStorage.removeItem("currentUser");
        // dispatch global event so app can redirect or show message
        window.dispatchEvent(new Event("auth:logout"));
      } catch (e) {
        // ignore storage errors
      }
      return null;
    }

    if (!resp.ok) {
      throw new Error("Non-OK response: " + resp.status);
    }

    const data = await resp.json();
    if (data && data.success && data.user) return data.user;
    return null;
  } catch (err) {
    clearTimeout(timeout);
    // Retry once for transient errors (network hiccup)
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 250));
      return fetchProfileFromServer(token, Math.min(timeoutMs * 1.5, 5000), attempt + 1);
    }
    return null;
  }
}

export function ProfileProvider({ children }) {
  const [profile, setProfileState] = useState(() => {
    // synchronous hydration from localStorage for instant UI
    try {
      const raw = localStorage.getItem("userProfile") || localStorage.getItem("currentUser");
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore parse errors
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);
  const pendingRefreshRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pendingRefreshRef.current) {
        clearTimeout(pendingRefreshRef.current);
        pendingRefreshRef.current = null;
      }
    };
  }, []);

  // Keep localStorage in sync whenever profile changes
  useEffect(() => {
    try {
      if (profile) {
        localStorage.setItem("userProfile", JSON.stringify(profile));
        localStorage.setItem("currentUser", JSON.stringify(profile));
        localStorage.setItem("profileFetchedAt", String(Date.now()));
      } else {
        localStorage.removeItem("userProfile");
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [profile]);

  // Listen to profile:updated events and storage events (cross-tab)
  useEffect(() => {
    function onProfileUpdated(evt) {
      try {
        const payload = evt?.detail;
        if (payload && typeof payload === "object") {
          if (mountedRef.current) setProfileState(payload);
        } else {
          // fallback: rehydrate from localStorage
          const raw = localStorage.getItem("userProfile") || localStorage.getItem("currentUser");
          if (raw && mountedRef.current) setProfileState(JSON.parse(raw));
        }
      } catch (_) {}
    }

    function onStorage(e) {
      if (!e) return;
      if (e.key === "userProfile" || e.key === "currentUser") {
        try {
          const raw = e.newValue;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (mountedRef.current) setProfileState(parsed);
          } else {
            if (mountedRef.current) setProfileState(null);
          }
        } catch (_) {}
      }
      if (e.key === "authToken" && !e.newValue) {
        // token removed -> clear profile
        if (mountedRef.current) setProfileState(null);
      }
    }

    window.addEventListener("profile:updated", onProfileUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("profile:updated", onProfileUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // fetchProfile: wrapper that calls fetchProfileFromServer(token)
  const fetchProfile = async (tokenArg = null, timeoutMs = 3000) => {
    const token = tokenArg || localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      if (mountedRef.current) setProfileState(null);
      return null;
    }

    setIsLoading(true);
    try {
      const user = await fetchProfileFromServer(token, timeoutMs);
      if (user && mountedRef.current) {
        setProfileState(user);
        // broadcast to the app that profile updated
        try {
          window.dispatchEvent(new CustomEvent("profile:updated", { detail: user }));
        } catch (e) {}
      }
      return user;
    } finally {
      setTimeout(() => {
        if (mountedRef.current) setIsLoading(false);
      }, 80);
    }
  };

  // setter that synchronizes storage + broadcasts event
  const setProfile = (user) => {
    if (!mountedRef.current) return;
    setProfileState(user);
    try {
      if (user) {
        localStorage.setItem("userProfile", JSON.stringify(user));
        localStorage.setItem("currentUser", JSON.stringify(user));
        localStorage.setItem("profileFetchedAt", String(Date.now()));
        window.dispatchEvent(new CustomEvent("profile:updated", { detail: user }));
      } else {
        localStorage.removeItem("userProfile");
      }
    } catch (e) {
      // ignore
    }
  };

  // Debounced listener: refresh on 'balance:changed' and 'profile:refresh'
  useEffect(() => {
    function scheduleImmediateRefresh(delay = 250) {
      if (pendingRefreshRef.current) {
        clearTimeout(pendingRefreshRef.current);
      }
      pendingRefreshRef.current = setTimeout(async () => {
        pendingRefreshRef.current = null;
        try {
          await fetchProfile(null, 3000);
        } catch (e) {
          // ignore
        }
      }, delay);
    }

    const onBalanceChanged = () => scheduleImmediateRefresh(200);
    const onProfileRefresh = () => scheduleImmediateRefresh(0);

    window.addEventListener("balance:changed", onBalanceChanged);
    window.addEventListener("profile:refresh", onProfileRefresh);

    return () => {
      window.removeEventListener("balance:changed", onBalanceChanged);
      window.removeEventListener("profile:refresh", onProfileRefresh);
      if (pendingRefreshRef.current) {
        clearTimeout(pendingRefreshRef.current);
        pendingRefreshRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background refresh once on mount (non-blocking)
  useEffect(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) return;
    (async () => {
      try {
        await fetchProfile(token, 3000);
      } catch (e) {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    profile,
    fetchProfile,
    setProfile,
    isLoading,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}

export default ProfileProvider;
