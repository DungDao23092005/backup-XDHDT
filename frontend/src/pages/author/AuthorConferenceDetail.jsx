import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import conferenceApi from "../../api/conferenceApi";
import { toast } from "react-toastify";

const API_BASE_URL = "http://localhost:8000"; 

const getLogoUrl = (logoPath) => {
  if (!logoPath) return null;
  if (logoPath.startsWith("http")) return logoPath;
  const cleanPath = logoPath.startsWith("/") ? logoPath.slice(1) : logoPath;
  return `${API_BASE_URL}/conference/${cleanPath}`; 
};


export default function AuthorConferenceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- STATE ---
  const [conference, setConference] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("intro"); // intro | topics | organizers | venue
  const [imgError, setImgError] = useState(false);
  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Gọi song song 2 API: Chi tiết hội nghị & Danh sách Tracks
        const [confData, tracksData] = await Promise.all([
          conferenceApi.getConferenceById(id),
          conferenceApi.getTracksByConference(id)
        ]);

        setConference(confData);
        setTracks(Array.isArray(tracksData) ? tracksData : []);
      } catch (error) {
        console.error("Lỗi tải dữ liệu chi tiết:", error);
        toast.error("Không tìm thấy hội nghị hoặc lỗi kết nối.");
        navigate("/author/conferences"); // Quay về nếu lỗi
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id, navigate]);

  // --- LOGIC HIỂN THỊ ---
  if (loading) return <div className="p-10 text-center text-slate-500">Đang tải thông tin chi tiết...</div>;
  if (!conference) return null;

  const logoUrl = getLogoUrl(conference.logo);
  const startDate = new Date(conference.start_date);
  const endDate = new Date(conference.end_date);
  
  // Giả lập deadline nộp bài (lấy trước ngày bắt đầu 1 tháng)
  const submissionDeadline = new Date(startDate);
  submissionDeadline.setMonth(submissionDeadline.getMonth() - 1);

  const isClosed = new Date() > endDate;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f6f7f8] dark:bg-[#101922] overflow-y-auto animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-8">

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Logo */}
            <div className="size-24 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-2">
              {!imgError && logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {!isClosed ? (
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                    Đang nhận bài
                  </span>
                ) : (
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                    Đã kết thúc
                  </span>
                )}
                <span className="text-slate-400 text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">public</span>
                  Hội nghị Khoa học
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                {conference.name}
              </h1>
              <p className="text-slate-500 mt-2 flex items-center gap-4 text-sm font-medium">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">calendar_month</span> 
                  {startDate.toLocaleDateString("vi-VN")} - {endDate.toLocaleDateString("vi-VN")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">location_on</span> 
                  Trụ sở chính UTH
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto">
              {!isClosed && (
                <Link 
                  to="/author/submissions/new" 
                  state={{ conferenceId: conference.id }}
                  className="px-6 py-3 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: "var(--primary)", boxShadow: "0 10px 20px -10px var(--primary)" }}
                >
                  <span className="material-symbols-outlined">upload_file</span>
                  Nộp bài báo ngay
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT BODY */}
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-10 gap-8 w-full">
        
        {/* LEFT COLUMN (Content) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Tabs Navigation */}
          <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-8 sticky top-0 bg-[#f6f7f8] dark:bg-[#101922] z-10 pt-2">
            {[
              { id: "intro", label: "Giới thiệu" },
              { id: "topics", label: "Chủ đề (Tracks)" },
              { id: "organizers", label: "Ban tổ chức" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-1 text-sm font-bold transition-all border-b-2 ${
                  activeTab === tab.id 
                    ? "border-[var(--primary)] text-[var(--primary)]" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                style={activeTab === tab.id ? { color: "var(--primary)", borderColor: "var(--primary)" } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT: INTRO */}
          {activeTab === "intro" && (
            <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>info</span>
                Giới thiệu Hội nghị
              </h3>
              <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 space-y-4 leading-relaxed">
                <p>{conference.description || "Chưa có mô tả chi tiết."}</p>
                
                {/* Khối điểm nổi bật giả lập */}
                <div 
                  className="p-4 rounded-xl border-l-4 mt-6"
                  style={{ backgroundColor: "rgb(var(--primary-rgb) / 0.05)", borderColor: "var(--primary)" }}
                >
                  <p className="font-bold text-slate-900 dark:text-slate-200 mb-2">Thông tin quan trọng:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Hội nghị chấp nhận bài báo tiếng Việt và tiếng Anh.</li>
                    <li>Các bài báo xuất sắc sẽ được đề cử đăng trên tạp chí Khoa học GTVT.</li>
                    <li>Người tham dự sẽ nhận được chứng nhận từ Ban Tổ Chức.</li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* TAB CONTENT: TOPICS (TRACKS) */}
          {activeTab === "topics" && (
            <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>list_alt</span>
                Danh sách Chủ đề (Tracks)
              </h3>
              
              {tracks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tracks.map((track) => (
                    <div key={track.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Logo Track nếu có */}
                        <div className="size-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                           <TrackItem key={track.id} track={track} />
                        </div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-[var(--primary)] transition-colors">{track.name}</p>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{track.description || "Chưa có mô tả."}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 italic text-center py-10">Chưa có Tracks nào được tạo cho hội nghị này.</div>
              )}
            </section>
          )}

          {/* TAB CONTENT: ORGANIZERS */}
          {activeTab === "organizers" && (
            <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="text-center py-10 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2">groups</span>
                  <p>Thông tin Ban tổ chức đang được cập nhật.</p>
               </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN (Sidebar Info) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TIMELINE CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>event_upcoming</span>
              <h4 className="font-bold text-slate-900 dark:text-white">Mốc thời gian</h4>
            </div>
            <div className="p-5 space-y-6 relative">
              {/* Vertical Line */}
              <div className="absolute left-[29px] top-8 bottom-8 w-px bg-slate-200 dark:border-slate-800"></div>
              
              {/* Item 1: Ngày bắt đầu (Start Date) */}
              <TimelineItem 
                color="primary" 
                title="Ngày bắt đầu" 
                date={startDate} 
                sub="Khai mạc hội nghị"
              />

              {/* Item 2: Ngày kết thúc (End Date) */}
              <TimelineItem 
                color="red" 
                title="Ngày kết thúc" 
                date={endDate}
                sub="Bế mạc & Hạn chót"
              />
            </div>
          </div>

          {/* RESOURCES CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>folder_open</span>
              <h4 className="font-bold text-slate-900 dark:text-white">Tài liệu & Biểu mẫu</h4>
            </div>
            <div className="p-4 space-y-2">
              <ResourceItem icon="picture_as_pdf" title="Hướng dẫn nộp bài" meta=".PDF (0.8 MB)" color="red" />
            </div>
          </div>

          {/* CTA CARD */}
          {!isClosed && (
            <div 
              className="rounded-2xl p-6 text-white shadow-xl"
              style={{ 
                background: "linear-gradient(135deg, var(--primary), rgb(var(--primary-rgb) / 0.6))",
                boxShadow: "0 10px 25px -5px var(--primary)"
              }}
            >
              <h4 className="font-bold text-lg mb-2">Sẵn sàng nộp bài?</h4>
              <p className="text-white/80 text-sm mb-6">Đảm bảo bài báo của bạn đã tuân thủ đúng định dạng của hội nghị trước khi tải lên.</p>
              <Link 
                to="/author/submissions/new"
                state={{ conferenceId: conference.id }}
                className="block w-full py-3 bg-white text-center font-bold rounded-xl transition-transform active:scale-95 hover:bg-slate-50"
                style={{ color: "var(--primary)" }}
              >
                Bắt đầu nộp bài
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function TrackItem({ track }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getLogoUrl(track.logo);

  return (
    <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
            {!imgError && logoUrl ? (
                <img 
                    src={logoUrl} 
                    className="w-full h-full object-cover" 
                    alt={track.name}
                    onError={() => setImgError(true)}
                />
            ) : (
                <span className="material-symbols-outlined text-slate-400">topic</span>
            )}
        </div>
        <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-[var(--primary)] transition-colors">{track.name}</p>
      </div>
      <p className="text-xs text-slate-500 line-clamp-2">{track.description || "Chưa có mô tả."}</p>
    </div>
  );
}

// --- SUB COMPONENT: TIMELINE ITEM ---
function TimelineItem({ color, title, date, sub }) {
  const isPrimary = color === "primary";
  const isRed = color === "red";
  
  let dotColor = "bg-slate-400";
  let titleColor = "text-slate-500";

  if (isPrimary) {
    dotColor = "bg-[var(--primary)]"; // Dùng biến CSS
    titleColor = "text-[var(--primary)]";
  } else if (isRed) {
    dotColor = "bg-red-500";
    titleColor = "text-red-500";
  }

  return (
    <div className="relative flex gap-4">
      <div className={`size-6 rounded-full border-4 border-white dark:border-slate-900 z-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800`}>
        <div className={`size-2 rounded-full ${isPrimary ? "" : dotColor}`} style={isPrimary ? { backgroundColor: "var(--primary)" } : {}}></div>
      </div>
      <div>
        <p className={`text-xs font-bold uppercase ${isPrimary ? "" : titleColor}`} style={isPrimary ? { color: "var(--primary)" } : {}}>{title}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-white">{date.toLocaleDateString("vi-VN")}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// --- SUB COMPONENT: RESOURCE ITEM ---
function ResourceItem({ icon, title, meta, color }) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    orange: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
    red: "text-red-600 bg-red-50 dark:bg-red-900/20",
  };

  return (
    <a href="#" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group">
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded flex items-center justify-center ${colorClasses[color]}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</p>
          <p className="text-[10px] text-slate-500 uppercase">{meta}</p>
        </div>
      </div>
      <span className="material-symbols-outlined text-slate-400 group-hover:text-[var(--primary)] transition-colors">download</span>
    </a>
  );
}