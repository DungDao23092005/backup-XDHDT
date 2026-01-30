// src/pages/common/AccountSettings.jsx
import React, { useMemo, useState } from "react";
import { useUISettings } from "../../context/UISettingsContext";
import { getResolvedTimeZone } from "../../utils/datetime";
import { useT } from "../../hooks/useT";


const ACCENT_COLORS = [
  { key: "primary", hex: "#1173d4", name: "Blue" },
  { key: "green", hex: "#059669", name: "Green" },
  { key: "violet", hex: "#7c3aed", name: "Violet" },
  { key: "orange", hex: "#ea580c", name: "Orange" },
  { key: "pink", hex: "#db2777", name: "Pink" },
];

/**
 * AccountSettings dùng chung cho mọi role.
 * Layout (Header + Sidebar) đã có sẵn => page này chỉ render nội dung.
 *
 * Data source:
 * - UISettingsContext (localStorage): theme, timezone, timeFormat, accentColor, language, emailPrefs
 */
export default function AccountSettings() {
  const {
    settings,
    setTheme,
    setTimezone,
    setTimeFormat,
    setAccentColor,
    setLanguage,
    setEmailPrefs,
  } = useUISettings();

  const t = useT();

  // ----- draft state -----
  const [draft, setDraft] = useState(() => ({
    theme: settings.theme ?? "system", // "light" | "dark" | "system"
    accentColor: settings.accentColor ?? "primary",
    language: settings.language ?? "vi", // "vi" | "en"
    timezone: settings.timezone ?? "auto",
    timeFormat: settings.timeFormat ?? "24h",
    emailPrefs: {
      reviewResult: settings.emailPrefs?.reviewResult ?? true,
      reviewerInvite: settings.emailPrefs?.reviewerInvite ?? true,
      deadlineReminder: settings.emailPrefs?.deadlineReminder ?? true,
    },
  }));

  const tzAutoLabel = useMemo(() => getResolvedTimeZone(), []);
  const timezones = useMemo(
    () => [
      { value: "auto", label: `(Tự động) ${tzAutoLabel}` },
      { value: "Asia/Ho_Chi_Minh", label: "(GMT+07:00) Hà Nội, Bangkok" },
      { value: "UTC", label: "(GMT+00:00) UTC" },
      { value: "Asia/Tokyo", label: "(GMT+09:00) Tokyo, Seoul" },
    ],
    [tzAutoLabel]
  );

  const accentHex =
    ACCENT_COLORS.find((c) => c.key === draft.accentColor)?.hex ?? "#1173d4";

  const isDirty = useMemo(() => {
    const s = settings;
    const d = draft;
    return (
      (s.theme ?? "system") !== d.theme ||
      (s.accentColor ?? "primary") !== d.accentColor ||
      (s.language ?? "vi") !== d.language ||
      (s.timezone ?? "auto") !== d.timezone ||
      (s.timeFormat ?? "24h") !== d.timeFormat ||
      (s.emailPrefs?.reviewResult ?? true) !== d.emailPrefs.reviewResult ||
      (s.emailPrefs?.reviewerInvite ?? true) !== d.emailPrefs.reviewerInvite ||
      (s.emailPrefs?.deadlineReminder ?? true) !== d.emailPrefs.deadlineReminder
    );
  }, [settings, draft]);

  const onCancel = () => {
    setDraft({
      theme: settings.theme ?? "system",
      accentColor: settings.accentColor ?? "primary",
      language: settings.language ?? "vi",
      timezone: settings.timezone ?? "auto",
      timeFormat: settings.timeFormat ?? "24h",
      emailPrefs: {
        reviewResult: settings.emailPrefs?.reviewResult ?? true,
        reviewerInvite: settings.emailPrefs?.reviewerInvite ?? true,
        deadlineReminder: settings.emailPrefs?.deadlineReminder ?? true,
      },
    });
  };

  const onSave = () => {
    setTheme(draft.theme);
    setTimezone(draft.timezone);
    setTimeFormat(draft.timeFormat);
    setAccentColor(draft.accentColor);
    setLanguage(draft.language);
    setEmailPrefs(draft.emailPrefs);
  };

  return (
    <div
      className="min-h-[calc(100vh-64px)]"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <div className="max-w-4xl mx-auto p-8 pb-28">
        {/* Title */}
        <div className="mb-10">
          <h2 className="text-3xl font-black tracking-tight" style={{ color: "var(--text)" }}>
            Cài đặt Tài khoản
          </h2>
          <p className="mt-2 text-lg" style={{ color: "var(--muted)" }}>
            Quản lý tùy chọn cá nhân, thông báo và bảo mật tài khoản.
          </p>
        </div>

        <div className="space-y-8">
          {/* ====== 1) Giao diện cá nhân ====== */}
          <Section
            icon="palette"
            title="Giao diện cá nhân"
            iconColor={accentHex}
          >
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Theme */}
              <div className="space-y-4">
                <label className="block font-semibold" style={{ color: "var(--muted)" }}>
                  Chế độ hiển thị
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <ThemeCard
                    title="Sáng"
                    active={draft.theme === "light"}
                    onClick={() => setDraft((p) => ({ ...p, theme: "light" }))}
                    preview={
                      <div
                        className="h-16 rounded mb-2 flex flex-col gap-1 p-2 border"
                        style={{ background: "#ffffff", borderColor: "rgb(0 0 0 / 0.10)" }}
                      >
                        <div className="h-1.5 w-full rounded" style={{ background: "rgb(15 23 42 / 0.06)" }} />
                        <div className="h-1.5 w-2/3 rounded" style={{ background: "rgb(15 23 42 / 0.06)" }} />
                      </div>
                    }
                    accentHex={accentHex}
                  />

                  <ThemeCard
                    title="Tối"
                    active={draft.theme === "dark"}
                    onClick={() => setDraft((p) => ({ ...p, theme: "dark" }))}
                    preview={
                      <div
                        className="h-16 rounded mb-2 flex flex-col gap-1 p-2 border"
                        style={{ background: "rgb(15 23 42)", borderColor: "rgb(148 163 184 / 0.25)" }}
                      >
                        <div className="h-1.5 w-full rounded" style={{ background: "rgb(148 163 184 / 0.25)" }} />
                        <div className="h-1.5 w-2/3 rounded" style={{ background: "rgb(148 163 184 / 0.25)" }} />
                      </div>
                    }
                    accentHex={accentHex}
                  />
                </div>

                {/* System */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, theme: "system" }))}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors"
                    style={{
                      borderColor:
                        draft.theme === "system" ? accentHex : "var(--border)",
                      color: draft.theme === "system" ? accentHex : "var(--muted)",
                      background:
                        draft.theme === "system"
                          ? "rgb(var(--primary-rgb) / 0.06)"
                          : "transparent",
                    }}
                  >
                    Theo hệ thống
                  </button>
                </div>
              </div>

              {/* Accent + Time format */}
              <div className="space-y-4">
                <label className="block font-semibold" style={{ color: "var(--muted)" }}>
                  Màu chủ đạo ưa thích
                </label>

                <div className="grid grid-cols-5 gap-3">
                  {ACCENT_COLORS.map((c) => {
                    const active = draft.accentColor === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setDraft((p) => ({ ...p, accentColor: c.key }))}
                        className={[
                          "aspect-square rounded-full transition-transform",
                          active ? "ring-4 flex items-center justify-center" : "hover:scale-110",
                        ].join(" ")}
                        style={{
                          backgroundColor: c.hex,
                          ringColor: c.hex,
                          ...(active ? { boxShadow: `0 0 0 6px ${c.hex}22` } : {}),
                        }}
                        aria-label={`accent-${c.key}`}
                        title={c.name}
                      >
                        {active && (
                          <span className="material-symbols-outlined text-xs text-white">
                            check
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Tùy chỉnh màu sắc hiển thị cho các nút bấm và điểm nhấn cá nhân.
                </p>

                <div className="pt-2">
                  <label className="block text-sm font-bold mb-2" style={{ color: "var(--muted)" }}>
                    Định dạng giờ
                  </label>
                  <div className="flex gap-2">
                    <ChipButton
                      active={draft.timeFormat === "24h"}
                      label="24 giờ"
                      onClick={() => setDraft((p) => ({ ...p, timeFormat: "24h" }))}
                      accentHex={accentHex}
                    />
                    <ChipButton
                      active={draft.timeFormat === "12h"}
                      label="12 giờ"
                      onClick={() => setDraft((p) => ({ ...p, timeFormat: "12h" }))}
                      accentHex={accentHex}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ====== 3) Thông báo Email ====== */}
          <Section icon="notifications" title="Thông báo Email" iconColor={accentHex}>
            <div className="p-6 space-y-4">
               <ToggleRow
                title="Nhắc nhở hạn chót"
                desc="Gửi nhắc nhở trước 3 ngày khi đến hạn nộp bài hoặc hạn phản biện."
                checked={draft.emailPrefs.deadlineReminder}
                onChange={(v) =>
                  setDraft((p) => ({
                    ...p,
                    emailPrefs: { ...p.emailPrefs, deadlineReminder: v },
                  }))
                }
                accentHex={accentHex}
              />
            </div>
          </Section>

          {/* ====== 4) Bảo mật ====== */}
          <Section icon="security" title="Bảo mật" iconColor={accentHex}>
            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-bold" style={{ color: "var(--text)" }}>
                    Mật khẩu
                  </p>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    Thay đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn.
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-colors border"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onClick={() => alert("Backend đổi mật khẩu sẽ làm sau")}
                >
                  Đổi mật khẩu
                </button>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* ===== Sticky Save Bar ===== */}
      <div
        className="fixed bottom-0 right-0 left-0 p-4 z-20 flex justify-end px-8 backdrop-blur-md border-t"
        style={{
          background: "rgb(0 0 0 / 0.00)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="flex items-center gap-4 rounded-2xl px-4 py-3 border"
          style={{
            background: "color-mix(in srgb, var(--surface) 85%, transparent)",
            borderColor: "var(--border)",
          }}
        >
          <span className="text-xs hidden md:block italic" style={{ color: "var(--muted)" }}>
            Mọi thay đổi đang được lưu (tạm thời) ở localStorage. Sau này sẽ sync backend.
          </span>

          <button
            type="button"
            onClick={onCancel}
            disabled={!isDirty}
            className="px-6 py-2.5 rounded-lg border font-bold text-sm transition-colors"
            style={{
              borderColor: isDirty ? "var(--border)" : "rgb(148 163 184 / 0.25)",
              color: isDirty ? "var(--text)" : "rgb(148 163 184 / 0.85)",
              background: isDirty ? "var(--surface-2)" : "rgb(148 163 184 / 0.10)",
              cursor: isDirty ? "pointer" : "not-allowed",
            }}
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty}
            className="px-8 py-2.5 rounded-lg text-white font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"
            style={{
              backgroundColor: isDirty ? accentHex : "rgb(148 163 184 / 0.35)",
              boxShadow: isDirty ? `${accentHex}33 0 10px 25px -12px` : "none",
              cursor: isDirty ? "pointer" : "not-allowed",
              opacity: isDirty ? 1 : 0.9,
            }}
          >
            <span className="material-symbols-outlined text-lg">check</span>
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Sub components
========================= */

function Section({ icon, title, iconColor, children }) {
  return (
    <section
      className="rounded-xl border shadow-sm overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="px-6 py-4 border-b flex items-center gap-2"
        style={{ borderColor: "var(--border)", background: "rgb(var(--primary-rgb) / 0.04)" }}
      >
        <span className="material-symbols-outlined" style={{ color: iconColor }}>
          {icon}
        </span>
        <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function ThemeCard({ title, active, onClick, preview, accentHex }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative group text-left cursor-pointer border-2 rounded-lg p-3 transition-colors"
      style={{
        borderColor: active ? accentHex : "var(--border)",
        background: active ? "rgb(var(--primary-rgb) / 0.05)" : "var(--surface-2)",
        color: "var(--text)",
      }}
    >
      {preview}
      <p className={["text-center text-xs", active ? "font-bold" : "font-medium"].join(" ")} style={{ color: active ? accentHex : "var(--muted)" }}>
        {title}
      </p>

      {active && (
        <div className="absolute top-1 right-1" style={{ color: accentHex }}>
          <span className="material-symbols-outlined text-lg">check_circle</span>
        </div>
      )}
    </button>
  );
}

function ChipButton({ active, label, onClick, accentHex }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-2 rounded-lg text-sm font-bold border transition-colors"
      style={{
        borderColor: active ? accentHex : "var(--border)",
        color: active ? accentHex : "var(--muted)",
        background: active ? "rgb(var(--primary-rgb) / 0.05)" : "var(--surface-2)",
      }}
    >
      {label}
    </button>
  );
}

function LangButton({ active, label, onClick, accentHex }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-2 px-3 rounded-md text-sm transition-colors"
      style={{
        background: active ? "var(--surface)" : "transparent",
        color: active ? accentHex : "var(--muted)",
        fontWeight: active ? 800 : 600,
        boxShadow: active ? "0 6px 16px rgb(0 0 0 / 0.10)" : "none",
      }}
    >
      {label}
    </button>
  );
}

function ToggleRow({ title, desc, checked, onChange, accentHex }) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="pr-4">
        <p className="font-bold" style={{ color: "var(--text)" }}>
          {title}
        </p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {desc}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full border transition"
        style={{
          background: checked ? accentHex : "rgb(148 163 184 / 0.25)",
          borderColor: checked ? `${accentHex}55` : "var(--border)",
        }}
        aria-pressed={checked}
        aria-label={title}
      >
        <span
          className="absolute top-[2px] size-5 rounded-full bg-white transition-transform"
          style={{
            left: 2,
            transform: checked ? "translateX(20px)" : "translateX(0px)",
            boxShadow: "0 6px 14px rgb(0 0 0 / 0.20)",
          }}
        />
      </button>
    </div>
  );
}
