import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";

const ROLE_META = {
  [ROLES.ADMIN]: { label: "Admin Portal", icon: "admin_panel_settings" },
  [ROLES.CHAIR]: { label: "Chair Portal", icon: "gavel" },
  [ROLES.REVIEWER]: { label: "Reviewer Portal", icon: "rate_review" },
  [ROLES.AUTHOR]: { label: "Author Portal", icon: "school" },
};

function pickPrimaryRole(roles = []) {
  const order = [ROLES.ADMIN, ROLES.CHAIR, ROLES.REVIEWER, ROLES.AUTHOR];
  for (const r of order) if (roles.includes(r)) return r;
  return null;
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const roles = useMemo(() => {
    return Array.isArray(user?.roles)
      ? user.roles.map((r) => String(r.role_name || r).toUpperCase())
      : [];
  }, [user?.roles]);

  const primaryRole = useMemo(() => pickPrimaryRole(roles), [roles]);
  const roleMeta = primaryRole ? ROLE_META[primaryRole] : null;

  const inDashboard =
    location.pathname.startsWith("/author") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/reviewer") ||
    location.pathname.startsWith("/chair");

  const displayName = user?.full_name || user?.sub || user?.email || "User";
  const initials = String(displayName || "U").trim().charAt(0).toUpperCase();

  return (
    <header
      className="h-14 flex items-center justify-between px-4 sm:px-6 shrink-0"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-3 hover:opacity-90"
      >
        <div
          className="h-9 w-9 rounded-xl text-white flex items-center justify-center shadow-sm"
          style={{ background: "var(--primary)" }}
        >
          <span className="text-[16px] font-black leading-none">U</span>
        </div>

        <div className="leading-tight text-left">
          <div className="text-[15px] font-black" style={{ color: "var(--text)" }}>
            UTH-ConfMS
          </div>
          <div className="text-[10px] font-bold tracking-widest" style={{ color: "var(--muted)" }}>
            CONFERENCE MANAGEMENT
          </div>
        </div>
      </button>

      {inDashboard && (
        <div className="flex items-center gap-3">
          {/* optional role label */}
          {roleMeta?.label && (
            <span
              className="hidden md:inline-flex text-xs font-black px-3 py-1 rounded-full border"
              style={{
                color: "var(--primary)",
                background: "rgb(var(--primary-rgb)/0.08)",
                borderColor: "rgb(var(--primary-rgb)/0.18)",
              }}
            >
              {roleMeta.label}
            </span>
          )}

          <div className="hidden sm:flex items-center gap-2">
            <div
              className="h-9 w-9 rounded-full border grid place-items-center font-black"
              style={{
                backgroundColor: "rgb(var(--primary-rgb) / 0.10)",
                borderColor: "rgb(var(--primary-rgb) / 0.25)",
                color: "var(--primary)",
              }}
            >
              {initials}
            </div>

            <div className="max-w-[220px]">
              <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                Xin chào
              </div>
              <div className="text-sm font-black truncate" style={{ color: "var(--text)" }}>
                {displayName}
              </div>
            </div>
          </div>

          {/* mobile */}
          <div
            className="sm:hidden h-9 w-9 rounded-full border grid place-items-center font-black"
            style={{
              backgroundColor: "rgb(var(--primary-rgb) / 0.10)",
              borderColor: "rgb(var(--primary-rgb) / 0.25)",
              color: "var(--primary)",
            }}
          >
            {initials}
          </div>
        </div>
      )}
    </header>
  );
}
