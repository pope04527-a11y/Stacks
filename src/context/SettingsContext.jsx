import React, { createContext, useContext, useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "https://stacks2-backend.onrender.com";

const SettingsContext = createContext({
  settings: null,
  loading: true,
  refresh: async () => {},
  currency: "",
  formatAmount: (v) => String(v),
});

export const useSettings = () => useContext(SettingsContext);

/**
 * SettingsProvider
 * - Fetches settings from GET /api/settings on mount
 * - Exposes: settings, loading, refresh(), currency (raw string), formatAmount()
 *
 * formatAmount: returns the numeric value to 2 decimals followed by a space and the raw currency string
 * Example: 0.00 USDT  or  12.34 GBP
 */
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const parseResponseToSettings = (json) => {
    // Accept multiple shapes:
    // 1) { success: true, settings: {...} }
    // 2) { settings: {...} }
    // 3) direct settings object { currency: "USDT", ... }
    if (!json) return null;
    if (json.success && json.settings) return json.settings;
    if (json.settings) return json.settings;
    // fallback: if it looks like a settings object (has currency or siteName) return it
    if (typeof json === "object" && (json.currency || json.siteName || json.defaultVip)) return json;
    return null;
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      if (!res.ok) {
        // If the endpoint returns 4xx/5xx, we still avoid crashing — keep previous settings
        console.warn("Failed to fetch settings, status:", res.status);
        setLoading(false);
        return;
      }
      const json = await res.json();
      const s = parseResponseToSettings(json);
      setSettings(s);
    } catch (err) {
      console.error("Settings fetch error:", err);
      // don't wipe settings on transient error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // OPTIONAL: later you can add a websocket/socket listener here that calls setSettings(...) when admin updates settings
  }, []);

  const currency = settings?.currency ?? "";

  const formatAmount = (value, opts = {}) => {
    const decimals = Number.isInteger(opts.decimals) ? opts.decimals : 2;
    const amount = Number(value || 0);
    const num = amount.toFixed(decimals);
    if (!currency) return num;
    // Return numeric amount followed by a space and the exact currency string stored in settings
    return `${num} ${currency}`;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        refresh: fetchSettings,
        currency,
        formatAmount,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
