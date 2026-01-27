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
      ? user.roles.map((r) => String(r).toUpperCase())
      : [];
  }, [user?.roles]);

  const primaryRole = useMemo(() => pickPrimaryRole(roles), [roles]);
  const roleMeta = primaryRole ? ROLE_META[primaryRole] : null;

  // dashboard area?
  const inDashboard =
    location.pathname.startsWith("/author") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/reviewer") ||
    location.pathname.startsWith("/chair");

  const displayName = user?.full_name || user?.sub || user?.email || "User";
  const initials = String(displayName || "U").trim().charAt(0).toUpperCase();

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-3 hover:opacity-90"
      >
        {/* NEW LOGO */}
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-600 to-fuchsia-600 text-white flex items-center justify-center shadow-sm">
          <span className="text-[16px] font-black leading-none">U</span>
        </div>

        <div className="leading-tight text-left">
          <div className="text-[15px] font-black text-slate-900">UTH-ConfMS</div>
          <div className="text-[10px] font-bold tracking-widest text-slate-400">
            CONFERENCE MANAGEMENT
          </div>
        </div>
      </button>

      {inDashboard && (
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-rose-50 border border-rose-100 grid place-items-center font-black text-rose-700">
              {initials}
            </div>
            <div className="max-w-[220px]">
              <div className="text-xs text-slate-500 font-semibold">Xin chào</div>
              <div className="text-sm font-black text-slate-800 truncate">{displayName}</div>
            </div>
          </div>

          {/* mobile: chỉ avatar */}
          <div className="sm:hidden h-9 w-9 rounded-full bg-rose-50 border border-rose-100 grid place-items-center font-black text-rose-700">
            {initials}
          </div>
        </div>
      )}
    </header>
  );
}
