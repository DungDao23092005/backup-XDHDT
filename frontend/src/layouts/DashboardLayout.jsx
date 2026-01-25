import React from "react";
import { Outlet, useLocation } from "react-router-dom";
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
    <div className="bg-[#f6f7f8] min-h-screen">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="ml-72 flex-1 flex flex-col min-w-0">
          {/* Header like mẫu */}
          <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
            <BreadCrumb />
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">
                  search
                </span>
                <input
                  className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Tìm kiếm..."
                  type="text"
                />
              </div>
              <button className="size-10 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors">
                <span className="material-symbols-outlined text-slate-600">
                  settings
                </span>
              </button>
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
