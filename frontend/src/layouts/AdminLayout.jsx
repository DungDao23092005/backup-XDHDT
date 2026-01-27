// File: src/layouts/AdminLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar"; 

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
      {/* Sidebar nằm cố định bên trái */}
      <Sidebar />
      
      {/* Khu vực nội dung bên phải (sẽ thay đổi tùy theo router con) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
         {/* Outlet là nơi render các trang con như DashboardOverview, UserManagement... */}
         <Outlet />
      </div>
    </div>
  );
}