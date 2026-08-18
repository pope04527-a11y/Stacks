import React, { createContext, useEffect, useState } from "react";

export const SettingsContext = createContext(null);

/*
  Non-blocking SettingsProvider
  - Provides immediate defaults so the UI can render even when network is blocked.
  - Attempts to fetch remote settings in background and merges them when available.
  - Falls back to a site-local settings.json (if you add one later) via import.meta.env.BASE_URL.
*/
export function SettingsProvider({ children }) {
  const defaultSettings = {
    siteName: "STACKS",
    theme: "light",
    currency: "USD",
    // add any keys your app expects so components don't crash
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      // 1) Try API (may be blocked by CORS)
      try {
        const resp = await fetch("https://stacks-admin.onrender.com/api/settings", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (resp && resp.ok) {
          const data = await resp.json();
          if (mounted && data && typeof data === "object") {
            setSettings(prev => ({ ...prev, ...data }));
          }
        } else {
          // non-OK - we'll fall back to local next
          // console.warn("Settings API returned", resp && resp.status);
        }
      } catch (e) {
        // network/CORS failure - fall back
        // console.warn("Remote settings fetch failed, falling back to local/defaults", e);
      }

      // 2) Try local fallback shipped with site (optional). Use Vite base to build correct path.
      try {
        const base = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL
          ? import.meta.env.BASE_URL
          : "/";
        const fallbackUrl = `${base}settings.json`;
        const fallbackResp = await fetch(fallbackUrl, { cache: "no-store" });
        if (fallbackResp && fallbackResp.ok) {
          const localData = await fallbackResp.json();
          if (mounted && localData && typeof localData === "object") {
            setSettings(prev => ({ ...prev, ...localData }));
          }
        }
      } catch (e) {
        // ignore - keep defaults
      }

      if (mounted) setLoading(false);
    }

    // fire-and-forget background load — UI already has defaults
    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export default SettingsContext;
