import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NavItem = ({ to, icon, label }) => {
  const { pathname } = useLocation();
  const active = pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={[
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      <span
        className="material-symbols-outlined text-xl"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      <span className={active ? "text-sm font-bold" : "text-sm font-medium"}>
        {label}
      </span>
    </Link>
  );
};

export default function ReviewerLayout() {
  const { user, logout } = useAuth();

  const displayName =
    user?.full_name || user?.name || user?.email || `Reviewer #${user?.id ?? ""}`;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-6 fixed h-full">
          <div className="flex flex-col gap-8">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined">school</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-primary text-lg font-bold leading-none">
                  UTH-ConfMS
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Hệ quản lý Hội nghị
                </p>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-2">
              <NavItem to="/reviewer" icon="description" label="Bài báo chấm điểm" />
              <NavItem to="/reviewer/coi" icon="gavel" label="Khai báo COI" />
              <NavItem to="/reviewer/notifications" icon="notifications" label="Thông báo" />
              <NavItem to="/reviewer/settings" icon="settings" label="Cài đặt" />
            </nav>
          </div>

          {/* Profile & Logout */}
          <div className="flex flex-col gap-4 border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex items-center gap-3 px-2">
              <div className="size-10 rounded-full bg-slate-200 bg-cover" />
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-bold truncate w-44">{displayName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Reviewer</p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="ml-72 flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
