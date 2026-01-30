// frontend/src/layouts/DashboardLayout.jsx
import { Outlet, useLocation, Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
// [MỚI] Import Hook xử lý FCM Notification
import useFcm from "../hooks/useFcm";

// --- COMPONENT BREADCRUMB (Điều hướng & Tiêu đề trang) ---
const BreadCrumb = () => {
  const { pathname } = useLocation();

  // 1. Định nghĩa tên tiếng Việt cho các đường dẫn
  const pathMap = {
    // --- AUTHOR (Tác giả) ---
    "/author": "Tổng quan",
    "/author/submissions": "Bài nộp của tôi",
    "/author/submissions/new": "Nộp bài mới",
    "/author/notifications": "Thông báo",
    "/author/settings": "Cài đặt tài khoản",
    "/author/profile": "Hồ sơ cá nhân",
    
    // --- CHAIR (Trưởng ban) ---
    "/chair": "Tổng quan",
    "/chair/papers": "Quản lý bài nộp",
    "/chair/review-assign": "Phân công phản biện",
    
    // --- REVIEWER (Phản biện) ---
    "/reviewer": "Tổng quan",
    "/reviewer/assignments": "Bài được phân công",
    "/reviewer/bidding": "Chọn bài (Bidding)",
    "/reviewer/coi": "Khai báo mâu thuẫn (COI)",

    // --- ADMIN (Quản trị) ---
    "/admin/dashboard": "Tổng quan hệ thống",
    "/admin/users": "Quản lý người dùng",
    "/admin/conferences": "Quản lý hội nghị",
    "/admin/settings": "Cấu hình hệ thống",
    "/admin/audit": "Nhật ký hoạt động",
  };

  // 2. Logic tìm tên trang
  let title = pathMap[pathname];

  // Xử lý các trang chi tiết (có ID động hoặc action)
  if (!title) {
    if (pathname.includes("/edit")) title = "Chỉnh sửa";
    else if (pathname.includes("/authors/new")) title = "Thêm tác giả";
    else if (pathname.includes("/review/")) title = "Chấm điểm (Review)";
    else if (pathname.includes("/author/submissions/")) title = "Chi tiết bài nộp";
    else if (pathname.includes("/admin/users/")) title = "Chi tiết người dùng";
    else title = "Trang chi tiết"; 
  }

  // [FIX] Bổ sung phần render giao diện bị thiếu
  return (
    <div className="mb-6 flex flex-col gap-1">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {title}
      </h1>
      <nav className="flex text-sm text-gray-500 dark:text-gray-400">
        <span>Dashboard</span>
        <span className="mx-2">/</span>
        <span className="text-primary font-medium">{title}</span>
      </nav>
    </div>
  );
};

// --- LAYOUT CHÍNH ---
export default function DashboardLayout() {
  // [MỚI] Kích hoạt logic FCM (Xin quyền & Lắng nghe thông báo)
  useFcm();

  return (
    <div
      className="h-screen bg-[#f8f6f6] flex flex-col overflow-hidden" 
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <Header />

      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 p-6 overflow-y-auto relative scroll-smooth">
          {/* Hiển thị tiêu đề trang */}
          <BreadCrumb />
          
          {/* Nội dung trang con sẽ nằm ở đây */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}