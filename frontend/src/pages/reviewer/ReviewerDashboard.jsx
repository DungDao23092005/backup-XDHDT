import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import reviewApi from "../../api/reviewApi";
import notificationApi from "../../api/notificationApi";
import { useAuth } from "../../context/AuthContext";

// --- Helpers ---
function normalizeStatus(s) {
  const st = (s || "").toString().toUpperCase();
  if (st === "INVITED") return "INVITED";
  if (st === "ACCEPTED") return "ACCEPTED";
  if (st === "COMPLETED") return "COMPLETED";
  if (st === "DECLINED") return "DECLINED";
  if (st === "COI" || st.includes("CONFLICT")) return "COI";
  return "UNKNOWN";
}

function timeAgo(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function daysLeft(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate).getTime();
  if (!Number.isFinite(due)) return null;
  const now = Date.now();
  const diff = due - now;
  const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Number.isFinite(d) ? d : null;
}

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notifications
  const [notiItems, setNotiItems] = useState([]);
  const [loadingNoti, setLoadingNoti] = useState(true);

  // --- 1. Load Assignments ---
  const loadAssignments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await reviewApi.listAssignments({ reviewerId: user.id });
      const raw = Array.isArray(res) ? res : (res?.data || []);

      // Check chéo trạng thái Review để update UI chính xác (Accepted -> Completed nếu đã nộp)
      const normalized = await Promise.all(raw.map(async (x) => {
        let st = normalizeStatus(x.status);

        // Nếu Assignment đang là Accepted, kiểm tra xem đã nộp bài chưa
        if (st === "ACCEPTED") {
            try {
                const rRes = await reviewApi.listReviews({ assignmentId: x.id });
                const reviews = Array.isArray(rRes) ? rRes : (rRes?.data || []);
                const r = reviews[0];
                if (r && (r.is_draft === false || r.submitted_at)) {
                    st = "COMPLETED"; 
                }
            } catch (ignore) { }
        }

        const dLeft = daysLeft(x.due_date);
        return {
          ...x,
          status: st,
          __daysLeft: dLeft,
        };
      }));

      setItems(normalized);
    } catch (e) {
      console.error("Load assignments error", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // --- 2. Load Notifications ---
  const loadNotifications = useCallback(async () => {
    try {
      setLoadingNoti(true);
      const res = await notificationApi.getMyInbox();
      const data = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotiItems(data);
    } catch (e) {
      console.error("Load notifications error:", e);
      setNotiItems([]);
    } finally {
      setLoadingNoti(false);
    }
  }, []);

  const markNotificationRead = useCallback(async (messageId) => {
    try {
      await notificationApi.markRead(messageId);
      setNotiItems((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
      );
    } catch (e) { }
  }, []);

  useEffect(() => {
    loadAssignments();
    loadNotifications();
  }, [loadAssignments, loadNotifications]);

  // --- 3. Compute Stats ---
  const stats = useMemo(() => {
    const total = items.length;
    const invited = items.filter(x => x.status === "INVITED").length;
    const accepted = items.filter(x => x.status === "ACCEPTED").length;
    const completed = items.filter(x => x.status === "COMPLETED").length;
    const declined = items.filter(x => x.status === "DECLINED").length;
    const coi = items.filter(x => x.status === "COI").length;
    return { total, invited, accepted, completed, declined, coi };
  }, [items]);

  // --- 4. Recent & Important Items ---
  // Ưu tiên hiện các bài Invited (cần accept) hoặc Accepted (cần chấm) lên đầu
  const recent = useMemo(() => {
    const priority = items.filter(x => ["INVITED", "ACCEPTED"].includes(x.status));
    const others = items.filter(x => !["INVITED", "ACCEPTED"].includes(x.status));
    
    // Sắp xếp priority theo deadline gần nhất
    priority.sort((a, b) => (a.__daysLeft ?? 999) - (b.__daysLeft ?? 999));
    
    return [...priority, ...others].slice(0, 5);
  }, [items]);

  const latestNoti = useMemo(() => notiItems.slice(0, 3), [notiItems]);
  const unreadCount = useMemo(() => notiItems.filter((n) => !n.is_read).length, [notiItems]);

  const upcomingDeadlines = useMemo(() => {
     return items
        .filter(x => x.status === "ACCEPTED" && x.__daysLeft != null && x.__daysLeft >= 0)
        .sort((a, b) => a.__daysLeft - b.__daysLeft)
        .slice(0, 3);
  }, [items]);

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Reviewer Dashboard
            </h2>
            <p className="text-slate-500 mt-1">
              Quản lý lời mời phản biện và tiến độ chấm bài của bạn.
            </p>
          </div>

          <div className="flex gap-3">
             <button
                onClick={() => navigate("/reviewer/coi")}
                className="flex items-center gap-2 px-5 h-12 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition"
             >
                <span className="material-symbols-outlined text-lg">gavel</span>
                <span>Khai báo COI</span>
             </button>

             <button
                onClick={() => navigate("/reviewer/assignments")}
                className="flex items-center gap-2 px-6 h-12 bg-[#1976d2] text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:opacity-95 active:scale-95 transition"
             >
                <span className="material-symbols-outlined text-lg">list_alt</span>
                <span>Danh sách bài báo</span>
             </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard
            title="Mời mới (Invited)"
            value={stats.invited}
            badge="Cần phản hồi ngay"
            tone="blue"
            icon="mail"
          />
          <StatCard
            title="Đang chấm (Accepted)"
            value={stats.accepted}
            badge="Đang thực hiện"
            tone="amber"
            icon="edit_document"
          />
          <StatCard
            title="Đã nộp review"
            value={stats.completed}
            badge="Hoàn thành"
            tone="green"
            icon="check_circle"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (Main) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Recent Assignments Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900">
                  Cần xử lý gần đây
                </h3>
                <button
                  onClick={() => navigate("/reviewer/assignments")}
                  className="text-[#1976d2] text-sm font-semibold hover:underline"
                >
                  Xem tất cả
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Bài báo</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Deadline</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td className="px-6 py-8 text-slate-500 text-center" colSpan={3}>Đang tải...</td></tr>
                    ) : recent.length === 0 ? (
                      <tr><td className="px-6 py-8 text-slate-500 text-center" colSpan={3}>Bạn chưa có assignment nào.</td></tr>
                    ) : (
                      recent.map((item) => (
                        <tr 
                           key={item.id} 
                           className="hover:bg-slate-50/60 transition cursor-pointer"
                           onClick={() => navigate(`/reviewer/assignments`)} // Chuyển hướng nhanh
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900 line-clamp-1">
                                {item.paper_title || item.title || `Paper #${item.paper_id}`}
                              </span>
                              <span className="text-xs text-slate-400 font-mono mt-0.5">
                                ID: {item.paper_id} • Track: {item.track_name || item.track || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             {item.due_date ? (
                                <div className="flex flex-col">
                                   <span className="text-sm text-slate-700 font-medium">
                                      {new Date(item.due_date).toLocaleDateString("vi-VN")}
                                   </span>
                                   {item.__daysLeft != null && item.status !== "COMPLETED" && (
                                      <span className={`text-[10px] font-bold ${item.__daysLeft < 3 ? 'text-rose-600' : 'text-slate-400'}`}>
                                         {item.__daysLeft < 0 ? "Quá hạn" : `Còn ${item.__daysLeft} ngày`}
                                      </span>
                                   )}
                                </div>
                             ) : <span className="text-sm text-slate-400">—</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge status={item.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-xl">🔔</span>
                  <h3 className="font-bold text-lg text-slate-900">Thông báo mới</h3>
                  {unreadCount > 0 && (
                    <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                <button
                   onClick={loadNotifications}
                   className="text-xs font-semibold text-slate-500 hover:text-[#1976d2]"
                >
                   Reload
                </button>
              </div>

              {loadingNoti ? (
                <div className="text-sm text-slate-500">Đang tải thông báo...</div>
              ) : latestNoti.length === 0 ? (
                <div className="text-sm text-slate-500 italic">Hiện chưa có thông báo nào.</div>
              ) : (
                <div className="space-y-3">
                  {latestNoti.map((n) => {
                    const unread = !n.is_read;
                    return (
                      <button
                        key={n.id}
                        onClick={() => unread && markNotificationRead(n.id)}
                        className={`w-full text-left p-4 rounded-xl border transition ${
                           unread 
                           ? "bg-blue-50/40 border-l-4 border-l-blue-400 border-blue-200" 
                           : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                         <div className="flex items-start justify-between gap-3">
                            <div>
                               <h4 className={`text-sm text-slate-900 ${unread ? "font-bold" : "font-semibold"}`}>
                                  {n.subject || "Thông báo hệ thống"}
                               </h4>
                               <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.body}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold shrink-0 whitespace-nowrap">
                               {timeAgo(n.created_at)}
                            </span>
                         </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-8">
             
             {/* Upcoming Deadlines */}
             <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2">
                   <span className="material-symbols-outlined text-rose-500">timer</span>
                   Sắp hết hạn (Accepted)
                </h3>
                
                {upcomingDeadlines.length === 0 ? (
                   <div className="text-sm text-slate-500">Tuyệt vời! Bạn không có bài nào sắp hết hạn.</div>
                ) : (
                   <div className="space-y-4">
                      {upcomingDeadlines.map((item, idx) => (
                         <div key={item.id}>
                            <div className="flex justify-between items-start mb-1">
                               <div className="font-bold text-slate-800 text-sm line-clamp-1 w-3/4" title={item.paper_title}>
                                  {item.paper_title || `Paper #${item.paper_id}`}
                               </div>
                               <div className="text-rose-600 font-black text-sm">
                                  {item.__daysLeft} ngày
                               </div>
                            </div>
                            <div className="text-xs text-slate-500">
                               Deadline: {new Date(item.due_date).toLocaleDateString("vi-VN")}
                            </div>
                            {idx < upcomingDeadlines.length - 1 && <div className="h-px bg-slate-100 mt-3" />}
                         </div>
                      ))}
                   </div>
                )}
             </div>

             {/* Help Box */}
             <div className="bg-gradient-to-br from-[#1976d2] to-blue-800 rounded-2xl p-6 text-white shadow-xl shadow-blue-200">
                <h4 className="font-bold text-lg mb-2">Quy định Review</h4>
                <p className="text-sm text-blue-100 mb-4 leading-relaxed">
                   Reviewer cần đảm bảo tính khách quan (double-blind). Nếu phát hiện xung đột lợi ích, vui lòng khai báo COI ngay.
                </p>
                <button 
                  onClick={() => window.open("https://example.com/review-guideline", "_blank")}
                  className="w-full py-3 bg-white text-[#1976d2] font-bold rounded-xl text-sm hover:bg-blue-50 transition"
                >
                   Xem hướng dẫn chi tiết
                </button>
             </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub Components ---

function StatCard({ title, value, badge, tone, icon }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
       {/* Icon nền mờ */}
       <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl text-slate-50 opacity-50 pointer-events-none">
          {icon}
       </span>

       <div className="relative z-10">
          <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
             {title}
          </p>
          <p className="text-4xl font-black text-slate-900 mt-2">
             {String(value).padStart(2, "0")}
          </p>
          <div className={`mt-3 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${toneMap[tone] || toneMap.blue}`}>
             {badge}
          </div>
       </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const st = normalizeStatus(status);
  const map = {
    INVITED: "bg-blue-100 text-blue-700 border border-blue-200",
    ACCEPTED: "bg-amber-100 text-amber-700 border border-amber-200",
    COMPLETED: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    DECLINED: "bg-slate-100 text-slate-600 border border-slate-200",
    COI: "bg-rose-100 text-rose-700 border border-rose-200",
  };
  
  const labels = {
    INVITED: "Mời mới",
    ACCEPTED: "Đang chấm",
    COMPLETED: "Hoàn thành",
    DECLINED: "Từ chối",
    COI: "COI",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight whitespace-nowrap ${map[st] || "bg-slate-100 text-slate-600"}`}>
      {labels[st] || st}
    </span>
  );
}