import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";

// --- CẤU HÌNH STYLE ---
const linkBase =
  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer";
const linkInactive =
  "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900";
// Active màu đỏ (Rose) cho Author/Admin
const linkActive =
  "bg-rose-50 text-rose-700 border border-rose-100 font-bold shadow-sm";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const roles = useMemo(() => {
    return Array.isArray(user?.roles)
      ? user.roles.map((r) => String(r).toUpperCase())
      : [];
  }, [user?.roles]);

  const hasRole = (role) => roles.includes(String(role).toUpperCase());

  const getInitials = (name) => (name || "U").charAt(0).toUpperCase();

  const isAuthorArea = location.pathname.startsWith("/author");
  const isAdminArea = location.pathname.startsWith("/admin");
  const isReviewerArea = location.pathname.startsWith("/reviewer");

  // =========================
  // 1) SIDEBAR CHO AUTHOR
  // =========================
  if (hasRole(ROLES.AUTHOR) && isAuthorArea) {
    const authorMenu = [
      { to: "/author", label: "Trang chủ", icon: "home" },
      { to: "/author/submissions", label: "Bài báo của tôi", icon: "article" },
      { to: "/author/submit", label: "Nộp bài mới", icon: "cloud_upload" },
      { to: "/author/profile", label: "Hồ sơ cá nhân", icon: "person" },
      { to: "/author/settings", label: "Cài đặt", icon: "settings" },
    ];

    return (
      <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen hidden lg:flex flex-col sticky top-0 z-20">
        <div className="p-4 flex flex-col gap-6 h-full">
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="size-8 bg-rose-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-rose-200">
              <span className="material-symbols-outlined text-xl">school</span>
            </div>
            <span className="text-lg font-black text-gray-900">Author Portal</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center font-black text-rose-700 border border-rose-200">
              {getInitials(user?.full_name || user?.email)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <h1 className="text-gray-900 text-sm font-bold truncate">
                {user?.full_name || "Tác giả"}
              </h1>
              <p className="text-gray-500 text-xs font-medium truncate">{user?.email}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scrollbar">
            {authorMenu.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/author"}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : linkInactive}`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <div className="my-2 border-t border-gray-100 mx-2" />
            <NavLink
              to="/"
              className={
                linkInactive +
                " flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
              }
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span>Về trang chính</span>
            </NavLink>
          </nav>

          <div className="mt-auto">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-rose-600 hover:bg-rose-50 font-bold transition-colors"
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // =========================
  // 2) SIDEBAR CHO ADMIN
  // =========================
  if (hasRole(ROLES.ADMIN) && isAdminArea) {
    const adminMenu = [
      { to: "/admin", label: "Tổng quan hệ thống", icon: "grid_view" },
      { to: "/admin/conferences", label: "Quản lý Hội nghị", icon: "calendar_month" },
      { to: "/admin/users", label: "Quản lý Người dùng", icon: "group" },
      { to: "/admin/settings", label: "Cấu hình hệ thống", icon: "settings" },
      { to: "/admin/audit", label: "Nhật ký hoạt động", icon: "history" },
    ];

    return (
      <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen hidden lg:flex flex-col sticky top-0 z-20">
        <div className="p-4 flex flex-col gap-6 h-full">
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="size-8 bg-rose-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-rose-200">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-none">UTH-ConfMS</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-1">
                Administrator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center font-black text-rose-700 border border-rose-200">
              {getInitials(user?.full_name || "Admin")}
            </div>
            <div className="flex flex-col overflow-hidden">
              <h1 className="text-gray-900 text-sm font-bold truncate">
                {user?.full_name || "Admin"}
              </h1>
              <p className="text-gray-500 text-xs font-medium truncate">Quản trị viên</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scrollbar">
            {adminMenu.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : linkInactive}`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <div className="my-2 border-t border-gray-100 mx-2" />
            <NavLink
              to="/"
              className={
                linkInactive +
                " flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
              }
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span>Về trang chính</span>
            </NavLink>
          </nav>

          <div className="mt-auto">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-rose-600 hover:bg-rose-50 font-bold transition-colors"
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // =========================
  // 3) SIDEBAR CHO REVIEWER (✅ ĐÃ CẬP NHẬT THÊM BIDDING)
  // =========================
  if ((hasRole(ROLES.REVIEWER) || hasRole(ROLES.ADMIN)) && isReviewerArea) {
    const reviewerMenu = [
      { to: "/reviewer", label: "Tổng quan", icon: "dashboard" },
      // --- THÊM MỤC BIDDING ---
      { to: "/reviewer/bidding", label: "Bidding (Chọn bài)", icon: "pan_tool" }, 
      { to: "/reviewer/assignments", label: "Bài báo chấm điểm", icon: "description" },
      { to: "/reviewer/coi", label: "Khai báo COI", icon: "gavel" },
    ];

    return (
      <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen hidden lg:flex flex-col sticky top-0 z-20">
        <div className="p-4 flex flex-col gap-6 h-full">
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-200">
              <span className="material-symbols-outlined text-xl">school</span>
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-none">UTH-ConfMS</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-1">
                Reviewer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-700 border border-slate-300">
              {getInitials(user?.full_name || user?.email)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <h1 className="text-gray-900 text-sm font-bold truncate">
                {user?.full_name || user?.name || "Reviewer"}
              </h1>
              <p className="text-gray-500 text-xs font-medium truncate">{user?.email}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scrollbar">
            {reviewerMenu.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/reviewer"}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? "bg-primary/10 text-primary font-bold" : linkInactive}`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <div className="my-2 border-t border-gray-100 mx-2" />
            <NavLink
              to="/"
              className={
                linkInactive +
                " flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
              }
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span>Về trang chính</span>
            </NavLink>
          </nav>

          <div className="mt-auto">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-rose-600 hover:bg-rose-50 font-bold transition-colors"
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // =========================
  // 4) SIDEBAR CHUNG (fallback)
  // =========================
  const menu = [
    { to: "/", label: "Trang chủ", icon: "home" },
    ...(hasRole(ROLES.AUTHOR) ? [{ to: "/author", label: "Khu vực Tác giả", icon: "edit_document" }] : []),
    ...(hasRole(ROLES.REVIEWER) || hasRole(ROLES.ADMIN)
      ? [{ to: "/reviewer", label: "Reviewer Dashboard", icon: "rate_review" }]
      : []),
    ...(hasRole(ROLES.CHAIR) ? [{ to: "/chair", label: "Chair Dashboard", icon: "gavel" }] : []),
    ...(hasRole(ROLES.ADMIN) ? [{ to: "/admin", label: "Admin Dashboard", icon: "dashboard" }] : []),
  ];

  return (
    <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen flex flex-col sticky top-0 z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-rose-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-rose-200">
          <span className="material-symbols-outlined text-2xl">account_balance</span>
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-gray-900">UTH-ConfMS</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Hệ thống chung</p>
        </div>
      </div>

      <div className="px-6 pb-4">
        <div className="text-xs text-gray-500 font-medium">Xin chào,</div>
        <div className="font-bold text-gray-900 truncate text-base">
          {user?.full_name || user?.sub || "User"}
        </div>
        <div className="text-xs text-rose-600 mt-1 font-bold bg-rose-50 inline-block px-2 py-0.5 rounded">
          {roles[0] || "GUEST"}
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-rose-600 hover:bg-rose-50 font-bold transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;