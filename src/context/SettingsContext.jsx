import React, { createContext, useEffect, useState } from "react";

/**
 * SettingsContext (non-blocking)
 *
 * - Immediately provides sensible default settings so the UI can render.
 * - Attempts to fetch remote settings in the background (won't block UI).
 * - Falls back to a site-local settings.json (if present under the Vite base) when the API is unreachable.
 * - Merges remote settings into defaults to avoid missing keys.
 */

export const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const defaultSettings = {
    siteName: "STACKS",
    theme: "light",
    currency: "USD",
    currencySymbol: "$",
    // add other expected defaults to avoid client errors
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      // Do not block rendering. Only set loading for informational purposes.
      setLoading(true);

      // Attempt remote API first (best-effort only)
      try {
        const apiUrl = "https://stacks-admin.onrender.com/api/settings";
        const resp = await fetch(apiUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (resp && resp.ok) {
          const apiData = await resp.json();
          if (mounted) {
            setSettings(prev => ({ ...prev, ...apiData }));
            setLoading(false);
            return;
          }
        } else {
          // non-200 status - fall through to fallback
          console.warn("Settings API responded with status", resp && resp.status);
        }
      } catch (err) {
        // network / CORS / other error - do not throw, fall back below
        console.warn("Fetching settings from API failed (non-blocking). Using fallback/defaults.", err);
      }

      // Fallback: attempt to load a static settings.json from the built site
      try {
        const base = import.meta.env.BASE_URL || "/";
        const fallbackUrl = `${base}settings.json`;
        const fallbackResp = await fetch(fallbackUrl, { cache: "no-store" });
        if (fallbackResp && fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          if (mounted) {
            setSettings(prev => ({ ...prev, ...fallbackData }));
            setLoading(false);
            return;
          }
        } else {
          console.warn("Fallback settings not found at", fallbackUrl, "status:", fallbackResp && fallbackResp.status);
        }
      } catch (err) {
        console.warn("Failed to load fallback settings (non-blocking):", err);
      }

      // Final fallback: keep defaults (already set) and stop loading.
      if (mounted) {
        setLoading(false);
      }
    }

    // Start background load (non-blocking)
    loadSettings();

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

export default SettingsProvider;
