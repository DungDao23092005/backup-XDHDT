import React, { useMemo } from "react";
import { NavLink, useLocation, matchPath, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";

// --- STYLE ---
const linkBase =
  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer";
const linkInactive =
  "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900";
const linkActive =
  "bg-rose-50 text-rose-700 border border-rose-100 font-bold shadow-sm";

// Header hiển thị Role hiện tại (Admin / Author / Reviewer)
function RoleHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-3 px-2 pt-2 mb-4">
      <div className="size-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-200">
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Portal</span>
        <span className="text-lg font-black text-gray-900 dark:text-white leading-none">{title}</span>
      </div>
    </div>
  );
}

// Khung Sidebar
function SidebarShell({ children }) {
  return (
    <aside className="w-72 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 hidden lg:flex flex-col sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
      <div className="p-4 flex flex-col gap-2 h-full">{children}</div>
    </aside>
  );
}

// Menu Nav Component
function MenuNav({ items }) {
  const location = useLocation();

  const isItemActive = (item) => {
    // Logic active chính xác hơn: so sánh prefix
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scrollbar">
      {items.map((item, index) => {
        const active = isItemActive(item);
        return (
          <NavLink
            key={index}
            to={item.to}
            end={item.exact}
            className={`${linkBase} ${active ? linkActive : linkInactive}`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

// Nút chuyển đổi Role (Hiển thị nếu user có quyền khác ngoài quyền hiện tại)
function RoleSwitcher({ currentArea, roles }) {
  // Logic: Nếu đang ở Admin mà user có quyền Author -> Hiện nút "Về trang Tác giả"
  // Đây là ví dụ đơn giản, bạn có thể custom thêm
  
  if (currentArea === "ADMIN" && roles.includes(ROLES.AUTHOR)) {
    return (
      <div className="mb-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
        <p className="text-xs text-slate-500 mb-1">Chuyển không gian:</p>
        <Link to="/author" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
          Giao diện Tác giả
        </Link>
      </div>
    );
  }

  if (currentArea === "AUTHOR" && roles.includes(ROLES.ADMIN)) {
    return (
      <div className="mb-2 px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
        <p className="text-xs text-indigo-500 mb-1">Quyền quản trị:</p>
        <Link to="/admin" className="text-sm font-bold text-indigo-700 hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
          Vào trang Admin
        </Link>
      </div>
    );
  }

  return null;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const roles = useMemo(() => {
    return Array.isArray(user?.roles)
      ? user.roles.map((r) => String(r.role_name || r).toUpperCase()) // Fix: check structure role object or string
      : [];
  }, [user?.roles]);

  const hasRole = (role) => roles.includes(role);

  // Xác định khu vực hiện tại dựa trên URL
  const isAuthorArea = location.pathname.startsWith("/author");
  const isChairArea = location.pathname.startsWith("/chair");
  const isAdminArea = location.pathname.startsWith("/admin");
  const isReviewerArea = location.pathname.startsWith("/reviewer");

  let menuItems = [];
  let portalTitle = "Trang chủ";
  let portalIcon = "home";
  let currentArea = "HOME";

  // =========================
  // 1. ADMIN AREA
  // =========================
  if (hasRole(ROLES.ADMIN) && isAdminArea) {
    currentArea = "ADMIN";
    portalTitle = "Quản trị viên";
    portalIcon = "admin_panel_settings";
    menuItems = [
      { to: "/admin/dashboard", label: "Tổng quan", icon: "grid_view", exact: true },
      { to: "/admin/users", label: "Quản lý Người dùng", icon: "group" },
      { to: "/admin/conferences", label: "Quản lý Hội nghị", icon: "calendar_month" },
      { to: "/admin/settings", label: "Cấu hình hệ thống", icon: "settings" },
      { to: "/admin/audit", label: "Nhật ký hoạt động", icon: "history" },
    ];
  }
  // =========================
  // 2. AUTHOR AREA
  // =========================
  else if (hasRole(ROLES.AUTHOR) && isAuthorArea) {
    currentArea = "AUTHOR";
    portalTitle = "Tác giả";
    portalIcon = "school";
    menuItems = [
      { to: "/author", label: "Dashboard", icon: "home", exact: true },
      { to: "/author/submissions", label: "Bài nộp của tôi", icon: "article" },
      { to: "/author/submissions/new", label: "Nộp bài mới", icon: "cloud_upload" },
      { to: "/author/notifications", label: "Thông báo", icon: "notifications" },
      { to: "/author/settings", label: "Cài đặt tài khoản", icon: "manage_accounts" },
    ];
  }
  // =========================
  // 3. REVIEWER AREA
  // =========================
  else if ((hasRole(ROLES.REVIEWER) || hasRole(ROLES.ADMIN)) && isReviewerArea) {
    currentArea = "REVIEWER";
    portalTitle = "Phản biện";
    portalIcon = "rate_review";
    menuItems = [
      { to: "/reviewer", label: "Tổng quan", icon: "dashboard", exact: true },
      { to: "/reviewer/bidding", label: "Chọn bài (Bidding)", icon: "pan_tool" },
      { to: "/reviewer/assignments", label: "Bài được phân công", icon: "assignment" },
      { to: "/reviewer/coi", label: "Khai báo mâu thuẫn", icon: "gavel" },
    ];
  }
  // =========================
  // 4. CHAIR AREA
  // =========================
  else if (hasRole(ROLES.CHAIR) && isChairArea) {
    currentArea = "CHAIR";
    portalTitle = "Trưởng ban";
    portalIcon = "gavel";
    menuItems = [
      { to: "/chair", label: "Tổng quan", icon: "space_dashboard", exact: true },
      { to: "/chair/papers", label: "Quản lý bài nộp", icon: "article" },
      { to: "/chair/review-assign", label: "Phân công phản biện", icon: "assignment_ind" },
    ];
  }
  // =========================
  // 5. FALLBACK (Home)
  // =========================
  else {
    menuItems = [
      { to: "/", label: "Trang chủ", icon: "home", exact: true },
    ];
    if (hasRole(ROLES.ADMIN)) menuItems.push({ to: "/admin", label: "Vào trang Admin", icon: "admin_panel_settings" });
    if (hasRole(ROLES.AUTHOR)) menuItems.push({ to: "/author", label: "Vào trang Tác giả", icon: "school" });
    if (hasRole(ROLES.REVIEWER)) menuItems.push({ to: "/reviewer", label: "Vào trang Phản biện", icon: "rate_review" });
  }

  return (
    <SidebarShell>
      <RoleHeader icon={portalIcon} title={portalTitle} />
      
      {/* Switcher giúp Admin nhảy qua lại Author dễ dàng */}
      <RoleSwitcher currentArea={currentArea} roles={roles} />

      <MenuNav items={menuItems} />

      <div className="mt-auto pt-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-rose-600 font-bold transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </SidebarShell>
  );
}