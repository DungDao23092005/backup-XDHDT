import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";

const BreadCrumb = () => {
  const { pathname } = useLocation();

  const map = {
    "/reviewer": "Tổng quan",
    "/reviewer/assignments": "Bài báo chấm điểm",
    "/reviewer/coi": "Khai báo COI",
  };

  const title =
    Object.entries(map).find(([k]) => pathname === k)?.[1] ||
    (pathname.includes("/reviewer/review/") ? "Review Form" : "Trang");

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span className="hover:text-primary transition-colors cursor-pointer">
        Trang chủ
      </span>
      <span className="material-symbols-outlined text-xs">chevron_right</span>
      <span className="text-slate-900 font-medium">{title}</span>
    </div>
  );
};

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#f8f6f6] flex flex-col overflow-x-hidden">
      <Header />

      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

