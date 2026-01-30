// src/components/common/OrganizerInfo.jsx (Nếu tách riêng)
// Hoặc để ngay trong DiscoverConferences.jsx

import React, { useState, useEffect } from "react";
import authApi from "../../api/authApi"; 
export default function OrganizerInfo({ userId }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
        setLoading(false);
        return;
    }
    
    // Gọi API lấy thông tin người tạo
    authApi.getUserById(userId)
      .then((res) => {
        setInfo(res); 
      })
      .catch((err) => {
        console.error("Không lấy được thông tin BTC:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <span className="text-xs text-slate-400 animate-pulse">Đang tải...</span>;
  
  if (!info) return <span className="text-xs text-slate-400">Không rõ BTC</span>;

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mt-1">
      <span className="material-symbols-outlined text-lg text-slate-400" title="Ban Tổ Chức">
        corporate_fare
      </span>
      <span className="truncate max-w-[200px]" title={`BTC: ${info.full_name}`}>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
            {info.organization || info.full_name}
        </span>
      </span>
    </div>
  );
}