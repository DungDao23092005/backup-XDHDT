import React from "react";

export default function DashboardOverview() {
  // --- Dữ liệu giả lập (Mock Data) ---
  const stats = [
    { 
      title: "Hội nghị Đang diễn ra", 
      value: "12", 
      change: "+2% so với tháng trước", 
      icon: "calendar_month", 
      color: "text-blue-600", 
      bg: "bg-blue-50" 
    },
    { 
      title: "Tổng số Người dùng", 
      value: "1,240", 
      change: "+15% người dùng mới", 
      icon: "group_add", 
      color: "text-indigo-600", 
      bg: "bg-indigo-50" 
    },
    { 
      title: "Lưu trữ (Đã dùng)", 
      value: "45.2 GB", 
      sub: "/ 100 GB",
      progress: 45, // %
      icon: "cloud", 
      color: "text-sky-600", 
      bg: "bg-sky-50" 
    },
    { 
      title: "Email đã gửi (Quota)", 
      value: "850", 
      sub: "/ 1,000",
      alert: "Sắp đạt giới hạn tháng",
      icon: "mail", 
      color: "text-orange-600", 
      bg: "bg-orange-50" 
    },
  ];

  const services = [
    { name: "Main Server", status: "ON", uptime: "99.98%", color: "bg-emerald-500" },
    { name: "AI Services (Review)", status: "ON", uptime: "Stable", color: "bg-emerald-500" },
    { name: "SMTP Mailer", status: "BUSY", uptime: "Queue: 14", color: "bg-amber-500" },
    { name: "Database Cluster", status: "ON", uptime: "Latency: 12ms", color: "bg-emerald-500" },
  ];

  // Dữ liệu cho biểu đồ cột đơn giản
  const chartData = [
    { label: "CNTT", value: 80 },
    { label: "Cơ khí", value: 65 },
    { label: "Điện", value: 45 },
    { label: "Kinh tế", value: 90 },
    { label: "Hàng hải", value: 30 },
    { label: "Môi trường", value: 55 },
    { label: "Xây dựng", value: 70 },
  ];

  const activities = [
    { user: "Nguyen Van A", action: "Đã nộp bài báo mới", target: "Hội nghị KHCN 2026", time: "2 phút trước", status: "success" },
    { user: "Tran Thi B", action: "Đã cập nhật profile", target: "Hệ thống", time: "15 phút trước", status: "info" },
    { user: "Admin UTH", action: "Đã phê duyệt người dùng", target: "Le Van C", time: "1 giờ trước", status: "warning" },
    { user: "System", action: "Backup dữ liệu tự động", target: "Database", time: "3 giờ trước", status: "success" },
  ];

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Bảng điều khiển Quản trị viên</h1>
        <p className="text-gray-500 mt-2">Chào mừng trở lại! Toàn bộ hệ thống đang hoạt động ổn định và an toàn.</p>
      </div>

      {/* 1. STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {stats.map((item, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{item.title}</p>
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white">{item.value}</h3>
                    {item.sub && <span className="text-sm text-gray-400 font-medium">{item.sub}</span>}
                  </div>
               </div>
               <div className={`size-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                  <span className="material-symbols-outlined">{item.icon}</span>
               </div>
            </div>
            
            {/* Logic hiển thị thay đổi hoặc progress bar */}
            {item.progress ? (
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
        {/* 2. MAIN CHART SECTION (Chiếm 2/3) */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thống kê Bài nộp theo Khoa/Viện</h3>
                    <p className="text-xs text-gray-500">Dữ liệu tổng hợp từ 6 tháng gần nhất</p>
                </div>
                <button className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200">Tất cả khoa</button>
            </div>
            
            {/* Biểu đồ cột CSS thuần (Simple Bar Chart) */}
            <div className="h-64 flex items-end justify-between gap-4 px-2">
                {chartData.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                        <div className="relative w-full bg-indigo-50 dark:bg-gray-700 rounded-t-lg h-full flex items-end overflow-hidden">
                             <div 
                                className="w-full bg-indigo-500 hover:bg-indigo-600 transition-all duration-500 rounded-t-lg relative group-hover:shadow-lg"
                                style={{ height: `${d.value}%` }}
                             >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    {d.value} bài
                                </div>
                             </div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase truncate w-full text-center">{d.label}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* 3. SERVICE STATUS (Chiếm 1/3) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Trạng thái Dịch vụ</h3>
            <p className="text-xs text-gray-500 mb-6">Cập nhật lúc: {new Date().toLocaleTimeString()}</p>

            <div className="space-y-4">
                {services.map((sv, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                             <div className={`size-2.5 rounded-full ${sv.color} animate-pulse`}></div>
                             <div>
                                 <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{sv.name}</p>
                                 <p className="text-[10px] text-gray-500 font-medium">{sv.uptime}</p>
                             </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                            sv.status === "ON" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                            {sv.status}
                        </span>
                    </div>
                ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Hệ thống backup tự động lúc 03:00 AM
                </div>
            </div>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hoạt động Hệ thống Gần đây</h3>
              <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Xem tất cả</button>
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
                      {activities.map((act, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-gray-900">{act.user}</td>
                              <td className="px-6 py-4 text-gray-600">{act.action}</td>
                              <td className="px-6 py-4 font-medium text-indigo-600 bg-indigo-50 rounded w-fit inline-block my-3 mx-6">{act.target}</td>
                              <td className="px-6 py-4 text-gray-400 text-xs">{act.time}</td>
                              <td className="px-6 py-4 text-right">
                                  {act.status === "success" && <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>}
                                  {act.status === "warning" && <span className="material-symbols-outlined text-amber-500 text-sm">error</span>}
                                  {act.status === "info" && <span className="material-symbols-outlined text-blue-500 text-sm">info</span>}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
}