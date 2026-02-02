import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { Link } from "react-router-dom";

export default function DashboardOverview() {
  // --- STATE ---
  const [stats, setStats] = useState({
    active_conferences: 0,
    total_users: 0,
    storage_used: 0,
    email_quota: 0
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- HÀM TẢI DỮ LIỆU ---
  const fetchDashboardData = async () => {
    try {
      // 1. Gọi API lấy thống kê tổng quan (User, Conference...)
      // API này được tạo ở Backend: src/routers/users.py -> get_dashboard_stats
      const statsRes = await axiosClient.get("/identity/api/users/stats/overview");
      
      // Cập nhật State Thống kê
      if (statsRes) {
        setStats({
          active_conferences: statsRes.active_conferences || 0,
          total_users: statsRes.total_users || 0,
          storage_used: statsRes.storage_used || 0,
          email_quota: statsRes.email_quota || 0
        });
        
        // Cập nhật danh sách hoạt động (lấy từ cùng API hoặc API riêng)
        // Nếu API stats/overview đã trả về recent_activities thì dùng luôn
        if (statsRes.recent_activities) {
            setActivities(statsRes.recent_activities);
        } else {
            // Fallback: Gọi API activities riêng nếu cần
            const actRes = await axiosClient.get("/identity/api/users/activities");
            setActivities(Array.isArray(actRes) ? actRes.slice(0, 5) : []);
        }
      }

    } catch (error) {
      console.error("Lỗi tải dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Tự động cập nhật mỗi 15 giây
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  // --- CẤU HÌNH GIAO DIỆN (VIEW) ---
  // Mảng này dùng để map ra giao diện, nhưng giá trị (value) sẽ lấy từ State
  const statCards = [
    {
      title: "Hội nghị Đang diễn ra",
      value: stats.active_conferences,
      change: "Cập nhật realtime",
      icon: "calendar_month",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Tổng số Người dùng",
      value: stats.total_users,
      change: "Tài khoản hoạt động",
      icon: "group_add",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Lưu trữ (Đã dùng)",
      value: `${stats.storage_used} GB`,
      sub: "/ 100 GB",
      progress: (stats.storage_used / 100) * 100, 
      icon: "cloud",
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
    {
      title: "Email đã gửi (Quota)",
      value: stats.email_quota,
      sub: "/ 1,000",
      alert: stats.email_quota > 900 ? "Sắp đạt giới hạn" : null,
      icon: "mail",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  const services = [
    { name: "Main Server", status: "ON", uptime: "99.98%", color: "bg-emerald-500" },
    { name: "AI Services", status: "ON", uptime: "Stable", color: "bg-emerald-500" },
    { name: "SMTP Mailer", status: "BUSY", uptime: "Queue: 14", color: "bg-amber-500" },
    { name: "Database", status: "ON", uptime: "Latency: 12ms", color: "bg-emerald-500" },
  ];

  const chartData = [
    { label: "CNTT", value: 80 },
    { label: "Cơ khí", value: 65 },
    { label: "Điện", value: 45 },
    { label: "Kinh tế", value: 90 },
    { label: "Hàng hải", value: 30 },
    { label: "Môi trường", value: 55 },
    { label: "Xây dựng", value: 70 },
  ];

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Tổng quan Hệ thống
        </h1>
        <p className="text-gray-500 mt-2">
          Chào mừng trở lại! Số liệu được cập nhật tự động theo thời gian thực.
        </p>
      </div>

      {/* 1. STATS CARDS (HIỂN THỊ SỐ LIỆU THẬT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {statCards.map((item, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                  {item.title}
                </p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                    {loading ? "..." : item.value}
                  </h3>
                  {item.sub && <span className="text-sm text-gray-400 font-medium">{item.sub}</span>}
                </div>
              </div>
              <div className={`size-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                <span className="material-symbols-outlined">{item.icon}</span>
              </div>
            </div>

            {item.progress !== undefined ? (
              <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
                <div className="bg-sky-600 h-2.5 rounded-full" style={{ width: `${item.progress}%` }}></div>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs font-bold">
                {item.alert ? (
                  <span className="text-orange-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span> {item.alert}
                  </span>
                ) : (
                  <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                    <span className="material-symbols-outlined text-sm">trending_up</span> {item.change}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        {/* 2. CHART SECTION (Giữ nguyên UI tĩnh) */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Thống kê Bài nộp
              </h3>
              <p className="text-xs text-gray-500">Dữ liệu tổng hợp từ 6 tháng gần nhất</p>
            </div>
            <button className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200">
              Tất cả khoa
            </button>
          </div>

          <div className="h-64 flex items-end justify-between gap-4 px-2">
            {chartData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                <div className="relative w-full bg-indigo-50 dark:bg-gray-700 rounded-t-lg h-full flex items-end overflow-hidden">
                  <div
                    className="w-full bg-indigo-500 hover:bg-indigo-600 transition-all duration-500 rounded-t-lg relative group-hover:shadow-lg"
                    style={{ height: `${d.value}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.value}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-500 uppercase truncate w-full text-center">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. SERVICE STATUS */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Trạng thái Dịch vụ</h3>
          <p className="text-xs text-gray-500 mb-6">Cập nhật lúc: {new Date().toLocaleTimeString()}</p>

          <div className="space-y-4">
            {services.map((sv, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className={`size-2.5 rounded-full ${sv.color} animate-pulse`}></div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{sv.name}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{sv.uptime}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                  {sv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY TABLE (HIỂN THỊ LOG THẬT) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hoạt động Hệ thống Gần đây</h3>
          <Link to="/admin/users" className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline">
            Xem chi tiết
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs font-bold uppercase">
              <tr>
                <th className="px-6 py-4">Người thực hiện</th>
                <th className="px-6 py-4">Hành động</th>
                <th className="px-6 py-4">Đối tượng</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4 text-right">Trạng thái</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
              ) : activities.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">Chưa có hoạt động nào</td></tr>
              ) : (
                activities.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{log.user_name || "Unknown"}</td>
                    <td className="px-6 py-4 text-gray-600">{log.action}</td>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">
                        {log.target || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString("vi-VN") : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}