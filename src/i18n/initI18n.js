// src/i18n/initI18n.js
// Minimal, robust i18n loader for static JSON bundles under the Vite base.
// This version avoids fragile syntax that can break the bundler.

const CACHE_PREFIX = "translations:";

function saveToLocalStorage(lang, dict) {
  try { localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(dict || {})); } catch (e) {}
}
function loadFromLocalStorage(lang) {
  try { const raw = localStorage.getItem(CACHE_PREFIX + lang); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function saveRawToLocalStorage(lang, rawDict) {
  try { localStorage.setItem(CACHE_PREFIX + lang + ":raw", JSON.stringify(rawDict || {})); } catch (e) {}
}
function loadRawFromLocalStorage(lang) {
  try { const raw = localStorage.getItem(CACHE_PREFIX + lang + ":raw"); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

async function fetchStaticBundle(lang) {
  try {
    // read BASE_URL safely — wrap in try/catch so bundler doesn't choke
    let base = "/";
    try {
      if (typeof import !== "undefined" && import.meta && import.meta.env && import.meta.env.BASE_URL) {
        base = import.meta.env.BASE_URL || "/";
      }
    } catch (e) {
      // import.meta might not be available at build-time; fall back to "/"
      base = "/";
    }
    if (!base.endsWith("/")) base += "/";
    const url = base + "i18n/" + lang + ".json";
    const resp = await fetch(url, { cache: "no-cache" });
    if (!resp || !resp.ok) return null;
    const json = await resp.json();
    return (json && typeof json === "object") ? json : null;
  } catch (e) {
    return null;
  }
}

// Lightweight DOM translation application helpers (kept simple)
function applyFullDictionary(dict) {
  if (!dict || Object.keys(dict).length === 0) return { applied: 0 };
  // data-i18n elements
  try {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = (el.getAttribute("data-i18n") || "").trim();
      if (!key) return;
      const t = dict[key];
      if (t === undefined) return;
      try { el.innerHTML = t; } catch (e) { el.textContent = t; }
    });
  } catch (e) {}
  // simple attribute translations (placeholder/title/alt)
  try {
    ["placeholder","title","alt","aria-label"].forEach(attr => {
      document.querySelectorAll("[" + attr + "]").forEach(el => {
        const val = el.getAttribute(attr);
        if (val && dict[val]) el.setAttribute(attr, dict[val]);
      });
    });
  } catch (e) {}
  try { window.dispatchEvent(new Event("languageChanged")); } catch (e) {}
  return { applied: 1 };
}

function ensureObserver(lang) {
  if (window.__I18N_OBSERVER_INSTALLED__) return;
  try {
    const obs = new MutationObserver(() => {
      const dict = (window.__TRANSLATIONS__ && window.__TRANSLATIONS__[lang]) || loadFromLocalStorage(lang) || {};
      if (Object.keys(dict).length) applyFullDictionary(dict);
    });
    obs.observe(document.documentElement || document.body, { childList: true, subtree: true, attributes: true });
    window.__I18N_OBSERVER_INSTALLED__ = true;
    window.__I18N_OBSERVER__ = obs;
  } catch (e) {}
}

function patchHistoryNavigation() {
  if (window.__I18N_HISTORY_PATCHED__) return;
  const dispatch = () => { try { window.dispatchEvent(new Event("spa:navigation")); } catch (e) {} };
  const push = history.pushState;
  history.pushState = function () { push.apply(this, arguments); dispatch(); };
  const replace = history.replaceState;
  history.replaceState = function () { replace.apply(this, arguments); dispatch(); };
  window.addEventListener("popstate", dispatch);
  window.__I18N_HISTORY_PATCHED__ = true;
}

async function initI18n(opts = {}) {
  const defaultLang = opts.defaultLang || localStorage.getItem("lang") || document.documentElement.getAttribute("lang") || "en";
  const lang = opts.lang || defaultLang;

  window.__TRANSLATIONS__ = window.__TRANSLATIONS__ || {};
  window.__RAW_TRANSLATIONS__ = window.__RAW_TRANSLATIONS__ || {};

  // Try static bundle (site) -> localStorage -> leave empty
  let raw = await fetchStaticBundle(lang);
  if (!raw) raw = loadRawFromLocalStorage(lang) || null;

  if (raw && Object.keys(raw).length) {
    window.__RAW_TRANSLATIONS__[lang] = raw;
    try { saveRawToLocalStorage(lang, raw); } catch (e) {}
    // simple substitution not required here; save as translations directly
    window.__TRANSLATIONS__[lang] = Object.assign({}, window.__TRANSLATIONS__[lang] || {}, raw || {});
    try { saveToLocalStorage(lang, window.__TRANSLATIONS__[lang]); } catch (e) {}
  } else {
    // fallback to cached substituted form
    const cached = loadFromLocalStorage(lang) || {};
    window.__TRANSLATIONS__[lang] = Object.assign({}, window.__TRANSLATIONS__[lang] || {}, cached || {});
  }

  // Apply to DOM
  applyFullDictionary(window.__TRANSLATIONS__[lang] || {});

  // Set document lang
  try { document.documentElement.setAttribute("lang", lang); } catch (e) {}

  ensureObserver(lang);
  patchHistoryNavigation();

  // On SPA navigation re-apply
  window.addEventListener("spa:navigation", () => {
    try {
      const cur = localStorage.getItem("lang") || lang;
      const dictNow = (window.__TRANSLATIONS__ && window.__TRANSLATIONS__[cur]) || loadFromLocalStorage(cur) || {};
      if (Object.keys(dictNow).length) applyFullDictionary(dictNow);
    } catch (e) {}
  });

  return { lang, applied: 1 };
}

export default initI18n;
