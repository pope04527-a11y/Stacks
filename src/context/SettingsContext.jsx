import React, { createContext, useEffect, useState } from "react";

/**
 * SettingsContext (non-blocking)
 * - Immediately provides sensible defaults so UI renders even if API is blocked.
 * - Attempts a best-effort API fetch in background and merges remote settings when available.
 * - Falls back to a site-local settings.json under Vite base if present.
 */

export const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const defaultSettings = {
    siteName: "STACKS",
    theme: "light",
    currency: "USD",
    currencySymbol: "$",
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setLoading(true);

      // Try remote API (best-effort)
      try {
        const resp = await fetch("https://stacks-admin.onrender.com/api/settings", { method: "GET", headers: { "Content-Type": "application/json" } });
        if (resp && resp.ok) {
          const data = await resp.json();
          if (mounted) setSettings(prev => ({ ...prev, ...data }));
          setLoading(false);
          return;
        }
      } catch (e) {
        // ignore - we'll fall back
        console.warn("Remote settings fetch failed (non-blocking).", e);
      }

      // Fallback to site-local settings.json (if deployed)
      try {
        const base = (typeof import !== "undefined" && import.meta && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : "/";
        const url = (base.endsWith("/") ? base : base + "/") + "settings.json";
        const resp2 = await fetch(url, { cache: "no-store" });
        if (resp2 && resp2.ok) {
          const data = await resp2.json();
          if (mounted) setSettings(prev => ({ ...prev, ...data }));
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Fallback settings fetch failed (non-blocking).", e);
      }

      if (mounted) setLoading(false);
    }

    loadSettings();
    return () => { mounted = false; };
  }, []);

  return <SettingsContext.Provider value={{ settings, loading }}>{children}</SettingsContext.Provider>;
}

export default SettingsProvider;
