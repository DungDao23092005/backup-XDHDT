// src/context/UISettingsContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import notificationApi from "../api/notificationApi";

const STORAGE_KEY = "uthconfms.ui_settings.v2";

/**
 * Accent colors map (bạn có thể thêm tùy ý).
 * key phải khớp với AccountSettings.jsx bạn dùng.
 */
const ACCENT_MAP = {
  primary: "#1173d4",
  green: "#059669",
  violet: "#7c3aed",
  orange: "#ea580c",
  pink: "#db2777",
};

/** Defaults dùng cho toàn hệ thống */
const DEFAULTS = {
  theme: "system", // "light" | "dark" | "system"
  accentColor: "primary", // key trong ACCENT_MAP
  language: "vi", // "vi" | "en"
  timezone: "auto", // "auto" | "Asia/Ho_Chi_Minh" | "UTC" | ...
  timeFormat: "24h", // "24h" | "12h"
  emailPrefs: {
    reviewResult: true,
    reviewerInvite: true,
    deadlineReminder: true,
  },
};

/** ---------- helpers ---------- */
function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isValidTheme(v) {
  return v === "light" || v === "dark" || v === "system";
}

function isValidTimeFormat(v) {
  return v === "24h" || v === "12h";
}

function normalizeSettings(input) {
  const s = { ...DEFAULTS, ...(input || {}) };

  // theme
  if (!isValidTheme(s.theme)) s.theme = DEFAULTS.theme;

  // accent
  if (!ACCENT_MAP[s.accentColor]) s.accentColor = DEFAULTS.accentColor;

  // language
  if (s.language !== "vi" && s.language !== "en") s.language = DEFAULTS.language;

  // timezone
  if (!s.timezone) s.timezone = DEFAULTS.timezone;

  // time format
  if (!isValidTimeFormat(s.timeFormat)) s.timeFormat = DEFAULTS.timeFormat;

  // email prefs
  s.emailPrefs = {
    reviewResult: s.emailPrefs?.reviewResult ?? DEFAULTS.emailPrefs.reviewResult,
    reviewerInvite: s.emailPrefs?.reviewerInvite ?? DEFAULTS.emailPrefs.reviewerInvite,
    deadlineReminder: s.emailPrefs?.deadlineReminder ?? DEFAULTS.emailPrefs.deadlineReminder,
  };

  return s;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return { r: 17, g: 115, b: 212 };
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return { r, g, b };
}

function getContrastColor({ r, g, b }) {
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#0b1220" : "#ffffff";
}

function applyTheme(theme) {
  const root = document.documentElement;
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  const systemDark = mq?.matches;

  const finalTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  if (finalTheme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function applyAccent(accentKey) {
  const root = document.documentElement;
  const hex = ACCENT_MAP[accentKey] || ACCENT_MAP.primary;
  const rgb = hexToRgb(hex);
  const contrast = getContrastColor(rgb);

  root.style.setProperty("--primary", hex);
  root.style.setProperty("--primary-rgb", `${rgb.r} ${rgb.g} ${rgb.b}`);
  root.style.setProperty("--primary-contrast", contrast);
}

/** ---------- context ---------- */
const UISettingsContext = createContext(null);

export function UISettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? safeParse(raw) : null;
    return normalizeSettings(parsed);
  });

  // persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // apply theme immediately + follow system change when theme=system
  useEffect(() => {
    applyTheme(settings.theme);

    if (settings.theme !== "system") return;

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const onChange = () => applyTheme("system");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [settings.theme]);

  // apply accent globally
  useEffect(() => {
    applyAccent(settings.accentColor);
  }, [settings.accentColor]);

    const api = useMemo(() => {
    return {
      settings,
      setTheme: (theme) => setSettings((s) => normalizeSettings({ ...s, theme })),
      setAccentColor: (accentColor) => setSettings((s) => normalizeSettings({ ...s, accentColor })),
      setLanguage: (language) => setSettings((s) => normalizeSettings({ ...s, language })),
      setTimezone: (timezone) => setSettings((s) => normalizeSettings({ ...s, timezone })),
      setTimeFormat: (timeFormat) => setSettings((s) => normalizeSettings({ ...s, timeFormat })),

      setEmailPrefs: async (emailPrefs) => {
        setSettings((s) => normalizeSettings({ ...s, emailPrefs }));
        try {
          if (typeof emailPrefs?.deadlineReminder === "boolean") {
            await notificationApi.updateMyPrefs({
              deadlineReminder: !!emailPrefs.deadlineReminder,
            });
          }
        } catch (e) {
          console.error("Sync prefs failed", e);
        }
      },

      reset: () => setSettings(DEFAULTS),
      hydrate: (partial) => setSettings((s) => normalizeSettings({ ...s, ...(partial || {}) })),
    };
  }, [settings]);


  return <UISettingsContext.Provider value={api}>{children}</UISettingsContext.Provider>;
}

export function useUISettings() {
  const ctx = useContext(UISettingsContext);
  if (!ctx) throw new Error("useUISettings must be used within UISettingsProvider");
  return ctx;
}

export const UI_ACCENT_MAP = ACCENT_MAP;
export const UI_DEFAULTS = DEFAULTS;
