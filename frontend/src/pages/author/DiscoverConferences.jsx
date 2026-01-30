import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import conferenceApi from "../../api/conferenceApi"; 
import OrganizerInfo from "./../common/OrganizerInfo"
import { toast } from "react-toastify";


const API_BASE_URL = "http://localhost:8000";
const getLogoUrl = (logoPath) => {
  if (!logoPath) return null;
  if (logoPath.startsWith("http")) return logoPath;

  const cleanPath = logoPath.startsWith("/") ? logoPath.slice(1) : logoPath;
  return `${API_BASE_URL}/conference/${cleanPath}`; 
};

export default function DiscoverConferences() {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // --- FILTER STATE ---
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); 

  // --- 1. CALL API ---
  const fetchConferences = async () => {
    try {
      setLoading(true);
      const data = await conferenceApi.getAllConferences();
      
      console.log("DB Data:", data); // Debug xem dữ liệu thật

      // Xử lý dữ liệu trả về an toàn
      const list = Array.isArray(data) ? data : data?.items || [];
      setConferences(list);
    } catch (err) {
      console.error(err);
      setError("Không thể tải dữ liệu hội nghị.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConferences();
  }, []);

  // --- 2. LOGIC LỌC (Chuẩn theo DB: name, start_date, end_date) ---
  const filteredConferences = useMemo(() => {
    return conferences.filter((conf) => {
      // a. Tìm theo tên (name)
      const confName = conf.name || ""; 
      const matchName = confName.toLowerCase().includes(keyword.toLowerCase());
      
      // b. Tìm theo trạng thái thời gian
      let matchStatus = true;
      const now = new Date();
      const start = new Date(conf.start_date);
      const end = new Date(conf.end_date);

      if (statusFilter === "open") {
        // Đang diễn ra: (Start <= Now <= End)
        matchStatus = now >= start && now <= end;
      } else if (statusFilter === "upcoming") {
        // Sắp diễn ra: (Now < Start)
        matchStatus = now < start;
      } else if (statusFilter === "closed") {
        // Đã kết thúc: (Now > End)
        matchStatus = now > end;
      }

      return matchName && matchStatus;
    });
  }, [conferences, keyword, statusFilter]);

  const handleSubmitNow = (confId) => {
    navigate("/author/submissions/new", { state: { conferenceId: confId } });
  };

  const handleViewDetail = (confId) => {
    navigate(`/author/conferences/${confId}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f6f7f8] dark:bg-[#101922] overflow-hidden animate-in fade-in duration-500">
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        
        {/* HEADER */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Khám phá Hội nghị</h2>
          <p className="text-slate-500 mt-1">Tìm kiếm và nộp bài cho các hội nghị khoa học.</p>
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search Input */}
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none transition-all shadow-sm dark:text-white" 
              placeholder="Nhập tên hội nghị để tìm..." 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
              onBlur={(e) => e.target.style.borderColor = ""}
            />
          </div>

          {/* Filter Status */}
          <div className="flex gap-4">
            <select 
              className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium outline-none shadow-sm min-w-[200px] dark:text-white cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
              onBlur={(e) => e.target.style.borderColor = ""}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="open">🟢 Đang diễn ra (Nhận bài)</option>
              <option value="upcoming">🔵 Sắp diễn ra</option>
              <option value="closed">🔴 Đã kết thúc</option>
            </select>
          </div>
        </div>

        {/* CONTENT GRID */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">
             <span className="material-symbols-outlined animate-spin text-4xl mb-2">progress_activity</span>
             <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredConferences.length > 0 ? (
                filteredConferences.map((conf) => (
                  <ConferenceCard 
                    key={conf.id} 
                    data={conf} 
                    onSubmit={() => handleSubmitNow(conf.id)}
                    onView={() => handleViewDetail(conf.id)}
                  />
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">search_off</span>
                  <p className="text-slate-500 italic">Không tìm thấy hội nghị nào.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- CARD COMPONENT (Chuẩn Schema DB) ---
function ConferenceCard({ data, onSubmit, onView }) {
  const [imgError, setImgError] = useState(false);
  const now = new Date();
  
  // DB: start_date, end_date
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  
  // Tính toán trạng thái
  let status = {
    text: "Sắp diễn ra",
    badgeBg: "bg-blue-100 dark:bg-blue-900/30",
    badgeColor: "text-blue-700 dark:text-blue-400",
    icon: "calendar_month",
    isOpen: false
  };

  if (now > end) {
    status = {
        text: "Đã kết thúc",
        badgeBg: "bg-slate-200 dark:bg-slate-800",
        badgeColor: "text-slate-500 dark:text-slate-400",
        icon: "event_busy",
        isOpen: false
    };
  } else if (now >= start && now <= end) {
    status = {
      text: "Đang nhận bài",
      badgeBg: "bg-green-100 dark:bg-green-900/30",
      badgeColor: "text-green-700 dark:text-green-400",
      icon: "campaign", // Icon cái loa hoặc memory
      usePrimaryStyle: true,
      isOpen: true
    };
  }

  // Fallback text
  const description = data.description || "Chưa có mô tả.";
  // Xử lý Logo: Nếu có logo -> hiển thị ảnh, nếu không -> hiển thị Icon mặc định
  const logoUrl = getLogoUrl(data.logo);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="p-6 flex-1">
        
        {/* Header: Logo & Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="size-16 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
            {!imgError && logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain p-1"
                onError={() => setImgError(true)} // Nếu lỗi -> setImgError = true
              />
            ): (
              <span className="material-symbols-outlined text-3xl text-slate-400">
                {status.icon}
              </span>
            )}
          </div>
          
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-transparent ${status.badgeBg} ${status.badgeColor}`}>
            {status.text}
          </span>
        </div>

        {/* Content: Name & Desc */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-tight min-h-[3.5rem] line-clamp-2" title={data.name}>
          {data.name}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 h-10">
          {description}
        </p>

        {/* Date Info */}
        <div className="space-y-2 pt-3 border-t border-slate-50 dark:border-slate-800/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-slate-400 text-lg">date_range</span>
            <span className="text-slate-600 dark:text-slate-300">
              Diễn ra: {start.toLocaleDateString("vi-VN")} - {end.toLocaleDateString("vi-VN")}
            </span>
          </div>
          {/* DB không có location, dùng tạm created_by hoặc ẩn đi */}
          <OrganizerInfo userId={data.created_by} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <button 
          onClick={onView}
          className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm"
        >
          Xem chi tiết
        </button>
        
        {status.isOpen ? (
            <button 
            onClick={onSubmit}
            className="flex-1 px-4 py-2 text-white font-bold rounded-lg transition-shadow shadow-sm text-sm hover:opacity-90 active:scale-95"
            style={{ backgroundColor: "var(--primary)" }}
            >
            Nộp bài
            </button>
        ) : (
             <button disabled className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold rounded-lg cursor-not-allowed text-sm">
                Đóng cổng
             </button>
        )}
      </div>
    </div>
  );
}