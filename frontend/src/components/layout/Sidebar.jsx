import React, { useMemo } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";

// --- STYLE GIỮ NGUYÊN TÔNG ROSE CỦA BẠN ---
const linkBase =
  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer";

const linkInactive =
  "text-[var(--muted)] hover:bg-[color:rgb(var(--primary-rgb)/0.06)] hover:text-[var(--text)]";

const linkActive =
  "bg-[color:rgb(var(--primary-rgb)/0.10)] text-[var(--primary)] border border-[color:rgb(var(--primary-rgb)/0.25)] font-black shadow-sm";

// Header hiển thị Role hiện tại (Admin / Author / Reviewer / Chair)
function RoleHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-3 px-2 pt-2 mb-4">
      <div
        className="size-10 rounded-xl flex items-center justify-center text-white shadow-lg"
        style={{
          backgroundColor: "var(--primary)",
          boxShadow: "0 10px 25px rgb(var(--primary-rgb) / 0.25)",
        }}
      >
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>

      <div>
        <span className="block text-xs font-extrabold text-[var(--muted)] uppercase tracking-wider">
          Portal
        </span>
        <span className="text-lg font-black text-[var(--text)] leading-none">
          {title}
        </span>
      </div>
    </div>
  );
}

// Khung Sidebar (dùng theme variables để dark đúng)
function SidebarShell({ children }) {
  return (
    <aside
      className="w-72 hidden lg:flex flex-col sticky top-14 h-[calc(100vh-56px)] overflow-y-auto"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div className="p-4 flex flex-col gap-2 h-full">{children}</div>
    </aside>
  );
}

// Menu Nav Component (GIỮ NGUYÊN CŨ)
function MenuNav({ items }) {
  return (
    <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scrollbar">
      {items.map((item, index) => (
        <NavLink
          key={index}
          to={item.to}
          end={!!item.end}
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkInactive}`
          }
        >
          <span className="material-symbols-outlined text-[20px]">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// Nút chuyển đổi Role (nếu user có quyền khác)
function RoleSwitcher({ currentArea, roles }) {
  // Admin -> Author
  if (currentArea === "ADMIN" && roles.includes(ROLES.AUTHOR)) {
    return (
      <div
        className="mb-2 px-4 py-2 rounded-lg border"
        style={{
          backgroundColor: "rgb(var(--primary-rgb) / 0.08)",
          borderColor: "rgb(var(--primary-rgb) / 0.20)",
        }}
      >
        <p className="text-xs text-[var(--muted)] mb-1">Chuyển không gian:</p>
        <Link
          to="/author"
          className="text-sm font-black hover:underline flex items-center gap-1"
          style={{ color: "var(--primary)" }}
        >
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
          Giao diện Tác giả
        </Link>
      </div>
    );
  }

  // Author -> Admin
  if (currentArea === "AUTHOR" && roles.includes(ROLES.ADMIN)) {
    return (
      <div
        className="mb-2 px-4 py-2 rounded-lg border"
        style={{
          backgroundColor: "rgb(var(--primary-rgb) / 0.08)",
          borderColor: "rgb(var(--primary-rgb) / 0.20)",
        }}
      >
        <p className="text-xs text-[var(--muted)] mb-1">Chuyển không gian:</p>
        <Link
          to="/admin"
          className="text-sm font-black hover:underline flex items-center gap-1"
          style={{ color: "var(--primary)" }}
        >
          <span className="material-symbols-outlined text-sm">
            admin_panel_settings
          </span>
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
      ? user.roles.map((r) => String(r.role_name || r).toUpperCase())
      : [];
  }, [user?.roles]);

  const hasRole = (role) => roles.includes(role);

  const isAuthorArea = location.pathname.startsWith("/author");
  const isAdminArea = location.pathname.startsWith("/admin");
  const isReviewerArea = location.pathname.startsWith("/reviewer");
  const isChairArea = location.pathname.startsWith("/chair");

  let menuItems = [];
  let portalTitle = "Trang chủ";
  let portalIcon = "home";
  let currentArea = "HOME";

  if (hasRole(ROLES.ADMIN) && isAdminArea) {
    currentArea = "ADMIN";
    portalTitle = "Quản trị viên";
    portalIcon = "admin_panel_settings";
    menuItems = [
      { to: "/admin/dashboard", label: "Tổng quan", icon: "grid_view", exact: true },
      { to: "/admin/profile", label: "Hồ sơ cá nhân", icon: "person" }, // ✅ THÊM MỚI
      { to: "/admin/users", label: "Quản lý Người dùng", icon: "group" },
      { to: "/admin/conferences", label: "Quản lý Hội nghị", icon: "calendar_month" },
      { to: "/admin/settings", label: "Cài đặt tài khoản", icon: "manage_accounts" },
      { to: "/admin/audit", label: "Nhật ký hoạt động", icon: "history" },
    ];
  } else if (hasRole(ROLES.AUTHOR) && isAuthorArea) {
    currentArea = "AUTHOR";
    portalTitle = "Tác giả";
    portalIcon = "school";
    menuItems = [
      { to: "/author", label: "Dashboard", icon: "home", end: true },
      { to: "/author/submissions", label: "Bài nộp của tôi", icon: "article", end: true },
      { to: "/author/submissions/new", label: "Nộp bài mới", icon: "cloud_upload", end: true },
      { to: "/author/notifications", label: "Thông báo", icon: "notifications", end: true },
      { to: "/author/settings", label: "Cài đặt tài khoản", icon: "manage_accounts", end: true },
    ];
  } else if ((hasRole(ROLES.REVIEWER) || hasRole(ROLES.ADMIN)) && isReviewerArea) {
    currentArea = "REVIEWER";
    portalTitle = "Phản biện";
    portalIcon = "rate_review";
    menuItems = [
      { to: "/reviewer", label: "Tổng quan", icon: "dashboard", end: true },
      { to: "/reviewer/profile", label: "Hồ sơ cá nhân", icon: "person", end: true }, // ✅ THÊM MỚI
      { to: "/reviewer/bidding", label: "Chọn bài (Bidding)", icon: "pan_tool", end: true },
      { to: "/reviewer/assignments", label: "Bài được phân công", icon: "assignment", end: true },
      { to: "/reviewer/coi", label: "Khai báo mâu thuẫn", icon: "gavel", end: true },
      { to: "/reviewer/settings", label: "Cài đặt tài khoản", icon: "manage_accounts", end: true },
    ];
  } else if (hasRole(ROLES.CHAIR) && isChairArea) {
    currentArea = "CHAIR";
    portalTitle = "Trưởng ban";
    portalIcon = "gavel";
    menuItems = [
      { to: "/chair", label: "Tổng quan", icon: "space_dashboard", end: true },
      { to: "/chair/papers", label: "Quản lý bài nộp", icon: "article", end: true },
      { to: "/chair/review-assign", label: "Phân công phản biện", icon: "assignment_ind", end: true },
      { to: "/chair/settings", label: "Cài đặt tài khoản", icon: "manage_accounts", end: true },
    ];
  } else {
    menuItems = [{ to: "/", label: "Trang chủ", icon: "home", end: true }];
    if (hasRole(ROLES.ADMIN))
      menuItems.push({ to: "/admin", label: "Vào trang Admin", icon: "admin_panel_settings" });
    if (hasRole(ROLES.AUTHOR))
      menuItems.push({ to: "/author", label: "Vào trang Tác giả", icon: "school" });
    if (hasRole(ROLES.REVIEWER))
      menuItems.push({ to: "/reviewer", label: "Vào trang Phản biện", icon: "rate_review" });
  }

  return (
    <SidebarShell>
      <RoleHeader icon={portalIcon} title={portalTitle} />
      <RoleSwitcher currentArea={currentArea} roles={roles} />

      <MenuNav items={menuItems} />

      <div className="mt-auto pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-black transition-colors"
          style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </SidebarShell>
  );
}
