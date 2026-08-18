// Lightweight global i18n initializer
// - Loads /i18n/<lang>.json (prefer static JSON), caches in window.__TRANSLATIONS__ and localStorage
// - Applies translations across the document (data-i18n, attributes, visible text nodes)
// - Re-applies on SPA navigation (patches history.*) and observes DOM mutations
// - Supports placeholder substitution for {{currency}} and {{currencySymbol}} so translations
//   update automatically when the site's currency changes (via CurrencyProvider).
// - Safe-guards included to avoid endless loops

const CACHE_PREFIX = "translations:";

function saveToLocalStorage(lang, dict) {
  try { localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(dict || {})); } catch (e) {}
}
function loadFromLocalStorage(lang) {
  try { const raw = localStorage.getItem(CACHE_PREFIX + lang); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
// store/retrieve raw (pre-substitution) bundle so we can re-substitute when currency changes
function saveRawToLocalStorage(lang, rawDict) {
  try { localStorage.setItem(CACHE_PREFIX + lang + ":raw", JSON.stringify(rawDict || {})); } catch (e) {}
}
function loadRawFromLocalStorage(lang) {
  try { const raw = localStorage.getItem(CACHE_PREFIX + lang + ":raw"); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

async function fetchStaticBundle(lang) {
  try {
    const res = await fetch(`/i18n/${lang}.json`, { cache: "no-cache" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json && typeof json === "object") ? json : null;
  } catch (e) { return null; }
}

// apply helpers (kept simple and robust)
function applyToDataI18nElements(dict) {
  const els = Array.from(document.querySelectorAll("[data-i18n]"));
  let applied = 0;
  els.forEach((el) => {
    try {
      const key = (el.getAttribute("data-i18n") || "").trim();
      if (!key) return;
      if (!Object.prototype.hasOwnProperty.call(dict, key)) return;
      const translation = dict[key];
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") {
        if (el.getAttribute("placeholder") !== null) el.setAttribute("placeholder", translation);
        else el.setAttribute("aria-label", translation);
      } else if (tag === "img") {
        if (el.getAttribute("alt") !== null) el.setAttribute("alt", translation);
      } else {
        // Intentionally replace innerHTML when data-i18n is present so component text is translated.
        try { el.innerHTML = translation; } catch (e) { el.textContent = translation; }
      }
      if (el.getAttribute("title") !== null) el.setAttribute("title", translation);
      applied++;
    } catch (e) { /* ignore per-element errors */ }
  });
  return applied;
}

function applyToAttributes(dict) {
  const attrs = ["placeholder", "title", "alt", "aria-label"];
  const all = Array.from(document.querySelectorAll("body *"));
  let applied = 0;
  all.forEach((el) => {
    try {
      attrs.forEach(attr => {
        if (!el.hasAttribute || !el.hasAttribute(attr)) return;
        const val = (el.getAttribute(attr) || "").trim();
        if (!val) return;
        if (Object.prototype.hasOwnProperty.call(dict, val)) {
          el.setAttribute(attr, dict[val]);
          applied++;
        }
      });
    } catch (e) {}
  });
  return applied;
}

function applyToTextNodes(dict) {
  const keys = Object.keys(dict || {}).filter(k => k && k.trim().length);
  if (keys.length === 0) return 0;
  keys.sort((a,b) => b.length - a.length); // longest-first
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentNode;
      if (!parent || !(parent instanceof HTMLElement)) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName.toLowerCase();
      if (['script','style','noscript','template','svg','code','pre','textarea'].includes(tag)) return NodeFilter.FILTER_REJECT;
      try {
        const cs = window.getComputedStyle(parent);
        if (!cs || cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return NodeFilter.FILTER_REJECT;
      } catch (e) {}
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let node;
  let replaced = 0;
  const max = 5000;
  while ((node = walker.nextNode())) {
    try {
      let text = node.nodeValue;
      let originalText = text;
      let changed = false;
      for (const key of keys) {
        if (!key) continue;
        if (text.includes(key)) {
          const translated = dict[key];
          if (translated === undefined || translated === null) continue;
          text = text.split(key).join(translated);
          changed = true;
          if (++replaced > max) break;
        }
      }
      if (changed && text !== originalText) {
        const parent = node.parentNode;
        if (!parent) continue;
        const containsHtml = /<\/?[a-z][\s\S]*>/i.test(text);
        if (containsHtml) {
          const span = document.createElement("span");
          span.innerHTML = text;
          parent.replaceChild(span, node);
        } else {
          node.nodeValue = text;
        }
      }
      if (replaced > max) break;
    } catch (e) {}
  }
  return replaced;
}

function applyFullDictionary(dict) {
  if (!dict || Object.keys(dict).length === 0) return { applied: 0, details: {} };
  const data = applyToDataI18nElements(dict);
  const attrs = applyToAttributes(dict);
  const text = applyToTextNodes(dict);
  try { window.dispatchEvent(new Event("languageChanged")); } catch (e) {}
  return { applied: data + attrs + text, details: { data, attrs, text } };
}

function ensureObserver(lang) {
  if (window.__I18N_OBSERVER_INSTALLED__) return;
  try {
    const observer = new MutationObserver((mutations) => {
      const dict = (window.__TRANSLATIONS__ && window.__TRANSLATIONS__[lang]) || loadFromLocalStorage(lang) || {};
      if (!dict || Object.keys(dict).length === 0) return;
      mutations.forEach(m => {
        try {
          if (m.type === "childList" && m.addedNodes && m.addedNodes.length) {
            m.addedNodes.forEach((n) => {
              if (!(n instanceof HTMLElement)) return;
              // priority: elements with data-i18n
              const found = Array.from(n.querySelectorAll ? n.querySelectorAll("[data-i18n]") : []);
              if (n.getAttribute && n.getAttribute("data-i18n")) found.unshift(n);
              if (found.length) {
                found.forEach(el => {
                  try {
                    const key = (el.getAttribute("data-i18n") || "").trim();
                    if (key && Object.prototype.hasOwnProperty.call(dict, key)) {
                      try { el.innerHTML = dict[key]; } catch (e) { el.textContent = dict[key]; }
                    }
                  } catch(e){}
                });
              } else {
                // fallback: translate text nodes inside subtree
                applyToTextNodes(dict);
              }
            });
          } else if (m.type === "attributes" && m.target) {
            const t = m.target;
            if (t instanceof HTMLElement && t.getAttribute && t.getAttribute("data-i18n")) {
              const key = (t.getAttribute("data-i18n") || "").trim();
              if (key && Object.prototype.hasOwnProperty.call(dict, key)) {
                try { t.innerHTML = dict[key]; } catch(e) { t.textContent = dict[key]; }
              }
            }
          }
        } catch (e) {}
      });
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-i18n","placeholder","title"] });
    window.__I18N_OBSERVER_INSTALLED__ = true;
    window.__I18N_OBSERVER__ = observer;
  } catch (e) { /* ignore */ }
}

function patchHistoryNavigation() {
  // dispatch an event 'spa:navigation' on pushState/replaceState and on popstate
  if (window.__I18N_HISTORY_PATCHED__) return;
  const dispatchNav = () => {
    try { window.dispatchEvent(new Event("spa:navigation")); } catch (e) {}
  };
  const origPush = history.pushState;
  history.pushState = function () {
    origPush.apply(this, arguments);
    dispatchNav();
  };
  const origReplace = history.replaceState;
  history.replaceState = function () {
    origReplace.apply(this, arguments);
    dispatchNav();
  };
  window.addEventListener("popstate", dispatchNav);
  window.__I18N_HISTORY_PATCHED__ = true;
}

/* ---------- Placeholder substitution helpers ---------- */

// Get current currency info from globals or localStorage fallback
function currentCurrencyInfo() {
  const currency = (typeof window !== "undefined" && window.CURRENT_CURRENCY) || localStorage.getItem("site:currency") || "";
  const symbol = (typeof window !== "undefined" && window.CURRENT_CURRENCY_SYMBOL) || localStorage.getItem("site:currencySymbol") || "";
  const decimalsRaw = (typeof window !== "undefined" && window.CURRENT_CURRENCY_DECIMALS);
  const decimals = Number.isFinite(decimalsRaw) ? decimalsRaw : (Number(localStorage.getItem("site:currencyDecimals")) || 2);
  const position = (typeof window !== "undefined" && window.CURRENT_CURRENCY_POSITION) || localStorage.getItem("site:currencyPosition") || "after";
  return { currency, symbol, decimals, position };
}

// Recursively substitute placeholders in a dictionary (returns new object)
function substitutePlaceholders(obj) {
  const { currency, symbol, decimals, position } = currentCurrencyInfo();

  const replaceInString = (s) => {
    if (typeof s !== "string") return s;
    let out = s;
    // standard placeholders
    out = out.split("{{currencySymbol}}").join(symbol || "");
    out = out.split("{{currency}}").join(currency || "");
    out = out.split("{{currencyDecimals}}").join(String(decimals != null ? decimals : ""));
    out = out.split("{{currencyPosition}}").join(String(position || ""));
    // also support shorter tags without braces if present (rare) e.g. %CURRENCY%
    out = out.split("%CURRENCY%").join(currency || "");
    out = out.split("%CURRENCY_SYMBOL%").join(symbol || "");
    return out;
  };

  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return replaceInString(obj);
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(item => substitutePlaceholders(item));
  const out = {};
  for (const k of Object.keys(obj)) {
    try {
      out[k] = substitutePlaceholders(obj[k]);
    } catch (e) {
      out[k] = obj[k];
    }
  }
  return out;
}

/* ---------- main loader ---------- */

async function initI18n(opts = {}) {
  const defaultLang = opts.defaultLang || localStorage.getItem("lang") || document.documentElement.getAttribute("lang") || "en";
  let lang = defaultLang;

  // if 'lang' param passed, use it
  if (opts.lang) lang = opts.lang;

  // ensure containers
  window.__TRANSLATIONS__ = window.__TRANSLATIONS__ || {};
  window.__RAW_TRANSLATIONS__ = window.__RAW_TRANSLATIONS__ || {};

  // 1) Try static bundle first (preferred) and keep raw bundle for later re-substitution
  let rawDict = null;
  try {
    const staticBundle = await fetchStaticBundle(lang);
    if (staticBundle && Object.keys(staticBundle).length > 0) {
      rawDict = staticBundle;
      // persist raw too so we can re-substitute after reloads
      try { saveRawToLocalStorage(lang, rawDict); } catch (e) {}
      window.__RAW_TRANSLATIONS__[lang] = rawDict;
    }
  } catch (e) {
    rawDict = null;
  }

  // 2) If no static bundle, attempt to get raw from localStorage (if previously saved)
  if (!rawDict) {
    const rawFromStorage = loadRawFromLocalStorage(lang);
    if (rawFromStorage && Object.keys(rawFromStorage).length > 0) {
      rawDict = rawFromStorage;
      window.__RAW_TRANSLATIONS__[lang] = rawDict;
    }
  }

  // 3) If still no raw, fall back to the previously saved (possibly already substituted) translations
  let dict = null;
  if (!rawDict) {
    const cached = (window.__TRANSLATIONS__ && window.__TRANSLATIONS__[lang]) || loadFromLocalStorage(lang);
    if (cached && Object.keys(cached).length > 0) {
      dict = cached; // we only have substituted form
    }
  }

  // 4) If we have a raw bundle, substitute placeholders now to produce the applied dict
  if (rawDict) {
    try {
      const substituted = substitutePlaceholders(rawDict);
      window.__TRANSLATIONS__[lang] = Object.assign({}, window.__TRANSLATIONS__[lang] || {}, substituted || {});
      // save substituted so future fast loads apply immediately
      saveToLocalStorage(lang, window.__TRANSLATIONS__[lang]);
    } catch (e) {
      window.__TRANSLATIONS__[lang] = Object.assign({}, window.__TRANSLATIONS__[lang] || {}, rawDict || {});
      saveToLocalStorage(lang, window.__TRANSLATIONS__[lang]);
    }
  } else if (dict) {
    // we only had substituted/cached dict available; use it
    window.__TRANSLATIONS__[lang] = Object.assign({}, window.__TRANSLATIONS__[lang] || {}, dict || {});
    saveToLocalStorage(lang, window.__TRANSLATIONS__[lang]);
  } else {
    // no translations available; ensure map exists
    window.__TRANSLATIONS__[lang] = window.__TRANSLATIONS__[lang] || {};
    saveToLocalStorage(lang, window.__TRANSLATIONS__[lang]);
  }

  // Apply to DOM now
  const result = applyFullDictionary(window.__TRANSLATIONS__[lang]);

  // Set HTML lang
  try { document.documentElement.setAttribute("lang", lang); } catch (e) {}

  // Setup observer
  ensureObserver(lang);
  // patch history so SPA navigation triggers re-apply
  patchHistoryNavigation();

  // On SPA navigation re-apply for the same language
  window.addEventListener("spa:navigation", () => {
    try {
      const curLang = localStorage.getItem("lang") || lang;
      const dictNow = (window.__TRANSLATIONS__ && window.__TRANSLATIONS__[curLang]) || loadFromLocalStorage(curLang) || {};
      if (dictNow && Object.keys(dictNow).length) applyFullDictionary(dictNow);
    } catch (e) {}
  });

  // When user changes language elsewhere (e.g. LanguageSwitcher sets localStorage 'lang'),
  // re-run loader & apply so all pages get updated automatically.
  window.addEventListener("storage", (ev) => {
    if (ev.key === "lang") {
      const newLang = ev.newValue || "en";
      (async () => {
        try {
          // Fetch static bundle (raw) if available
          let staticBundle = await fetchStaticBundle(newLang);
          if (staticBundle && Object.keys(staticBundle).length > 0) {
            window.__RAW_TRANSLATIONS__[newLang] = staticBundle;
            saveRawToLocalStorage(newLang, staticBundle);
            const substituted = substitutePlaceholders(staticBundle);
            window.__TRANSLATIONS__[newLang] = Object.assign({}, window.__TRANSLATIONS__[newLang] || {}, substituted || {});
            saveToLocalStorage(newLang, window.__TRANSLATIONS__[newLang]);
            applyFullDictionary(window.__TRANSLATIONS__[newLang]);
            document.documentElement.setAttribute("lang", newLang);
            return;
          }
          // fallback: try cached/raw
          const cachedRaw = loadRawFromLocalStorage(newLang) || window.__RAW_TRANSLATIONS__[newLang] || null;
          if (cachedRaw && Object.keys(cachedRaw).length) {
            const substituted = substitutePlaceholders(cachedRaw);
            window.__TRANSLATIONS__[newLang] = Object.assign({}, window.__TRANSLATIONS__[newLang] || {}, substituted || {});
            saveToLocalStorage(newLang, window.__TRANSLATIONS__[newLang]);
            applyFullDictionary(window.__TRANSLATIONS__[newLang]);
            document.documentElement.setAttribute("lang", newLang);
            return;
          }
          // last resort: use already-saved substituted dict (may not include placeholders)
          const cached = loadFromLocalStorage(newLang) || (window.__TRANSLATIONS__ && window.__TRANSLATIONS__[newLang]) || {};
          if (cached && Object.keys(cached).length) {
            window.__TRANSLATIONS__[newLang] = cached;
            applyFullDictionary(window.__TRANSLATIONS__[newLang]);
            document.documentElement.setAttribute("lang", newLang);
            return;
          }
        } catch (e) {}
      })();
    }
  });

  // Listen for currency changes (dispatched by CurrencyProvider)
  // When currency changes, re-substitute raw bundles (if available) and re-apply the active language
  try {
    if (!window.__I18N_CURRENCY_LISTENER_INSTALLED__) {
      window.addEventListener("app:currencyChanged", (ev) => {
        try {
          const detail = (ev && ev.detail) || {};
          // update globals if provided
          if (detail.currency !== undefined) {
            try { window.CURRENT_CURRENCY = detail.currency; } catch (e) {}
          }
          if (detail.symbol !== undefined) {
            try { window.CURRENT_CURRENCY_SYMBOL = detail.symbol; } catch (e) {}
          }
          if (detail.decimals !== undefined) {
            try { window.CURRENT_CURRENCY_DECIMALS = detail.decimals; } catch (e) {}
          }

          // For every language we have a raw bundle for, regenerate substituted and save/apply
          const langs = Object.keys(window.__RAW_TRANSLATIONS__ || {});
          langs.forEach(l => {
            try {
              const raw = window.__RAW_TRANSLATIONS__[l] || loadRawFromLocalStorage(l) || null;
              if (raw && Object.keys(raw).length) {
                const substituted = substitutePlaceholders(raw);
                window.__TRANSLATIONS__[l] = Object.assign({}, window.__TRANSLATIONS__[l] || {}, substituted || {});
                saveToLocalStorage(l, window.__TRANSLATIONS__[l]);
              }
            } catch (e) {}
          });

          // Re-apply current language so DOM updates immediately
          const cur = localStorage.getItem("lang") || lang;
          const dictNow = (window.__TRANSLATIONS__ && window.__TRANSLATIONS__[cur]) || loadFromLocalStorage(cur) || {};
          if (dictNow && Object.keys(dictNow).length) applyFullDictionary(dictNow);
        } catch (e) {
          // swallow
        }
      });
      window.__I18N_CURRENCY_LISTENER_INSTALLED__ = true;
    }
  } catch (e) {}

  return { lang, applied: result };
}

// default export
export default initI18n;
