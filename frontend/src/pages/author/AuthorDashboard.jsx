import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listMySubmissions } from "../../api/submissionApi";
import notificationApi from "../../api/notificationApi";

function normalizeStatus(s) {
  return String(s || "").toUpperCase();
}

function isUnderReview(status) {
  const st = normalizeStatus(status);
  return ["SUBMITTED", "UNDER_REVIEW", "REVIEWING", "IN_REVIEW"].includes(st);
}
function isAccepted(status) {
  const st = normalizeStatus(status);
  return ["ACCEPTED"].includes(st);
}

// --- helper format time ---
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

export default function AuthorDashboard() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ notifications state
  const [notiItems, setNotiItems] = useState([]);
  const [loadingNoti, setLoadingNoti] = useState(true);
  const [errorNoti, setErrorNoti] = useState("");

  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listMySubmissions();
      const data = Array.isArray(res) ? res : res?.items || [];
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setErrorNoti("");
      setLoadingNoti(true);

      const res = await notificationApi.getMyInbox();

      // axios trả về res.data
      const data = Array.isArray(res?.data) ? res.data : [];
      // sort mới nhất trước (nếu backend chưa sort)
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotiItems(data);
    } catch (e) {
      console.error("Load notifications error:", e);
      setErrorNoti(
        e?.response?.data?.detail ||
          e?.message ||
          "Không tải được thông báo"
      );
      setNotiItems([]);
    } finally {
      setLoadingNoti(false);
    }
  }, []);

  // ✅ mark as read
  const markNotificationRead = useCallback(
    async (messageId) => {
      try {
        await notificationApi.markRead(messageId);
        setNotiItems((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, is_read: true } : m
          )
        );
      } catch (e) {
        console.error("Mark read error:", e);
        // không bắt user phải reload, chỉ log
      }
    },
    []
  );

  useEffect(() => {
    loadSubmissions();
    loadNotifications();
  }, [loadSubmissions, loadNotifications]);

  const stats = useMemo(() => {
    const total = items.length;
    const underReview = items.filter((x) => isUnderReview(x.status)).length;
    const accepted = items.filter((x) => isAccepted(x.status)).length;
    const rate = total ? Math.round((accepted / total) * 100) : 0;
    return { total, underReview, accepted, rate };
  }, [items]);

  const recent = useMemo(() => items.slice(0, 5), [items]);

  // ✅ show only a few newest
  const latestNoti = useMemo(() => notiItems.slice(0, 3), [notiItems]);
  const unreadCount = useMemo(
    () => notiItems.filter((n) => !n.is_read).length,
    [notiItems]
  );

  return (
    <div className="bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Chào mừng trở lại, Tác giả!
            </h2>
            <p className="text-slate-500 mt-1">
              Xem lại tiến độ bài viết và các mốc thời gian quan trọng của bạn.
            </p>
          </div>

          <button
            onClick={() => navigate("/author/submit")}
            className="flex items-center gap-2 px-6 h-12 bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-200 hover:opacity-95 active:scale-95 transition"
          >
            <span className="text-lg">＋</span>
            <span>Nộp bài mới</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard
            title="Tổng số bài đã nộp"
            value={stats.total}
            badge={`+${Math.min(stats.total, 2)} tháng này`}
            tone="green"
          />
          <StatCard
            title="Bài đang đánh giá"
            value={stats.underReview}
            badge="Chờ phản biện"
            tone="amber"
          />
          <StatCard
            title="Đã được chấp nhận"
            value={stats.accepted}
            badge={`Tỉ lệ chấp nhận ${stats.rate}%`}
            tone="rose"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Submissions */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900">
                  Bài nộp gần đây
                </h3>
                <button
                  onClick={() => navigate("/author/submissions")}
                  className="text-rose-600 text-sm font-semibold hover:underline"
                >
                  Xem tất cả
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Tiêu đề
                      </th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Hội nghị
                      </th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td className="px-6 py-6 text-slate-500" colSpan={3}>
                          Đang tải...
                        </td>
                      </tr>
                    ) : recent.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6 text-slate-500" colSpan={3}>
                          Chưa có bài nào. Hãy bấm “Nộp bài mới”.
                        </td>
                      </tr>
                    ) : (
                      recent.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/60 transition"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900 line-clamp-1">
                                {p.title || "(Không có tiêu đề)"}
                              </span>
                              <span className="text-xs text-slate-400">
                                Nộp ngày:{" "}
                                {p.submitted_at
                                  ? new Date(p.submitted_at).toLocaleDateString()
                                  : "---"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600">
                              {p.conference_name ||
                                p.conference?.name ||
                                `#${p.conference_id ?? "-"}`}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ✅ Notifications - Connected */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-rose-500">📣</span>
                  <h3 className="font-bold text-lg text-slate-900">
                    Thông báo mới
                  </h3>
                  {unreadCount > 0 && (
                    <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      {unreadCount} chưa đọc
                    </span>
                  )}
                </div>

                <button
                  onClick={loadNotifications}
                  className="text-xs font-semibold text-slate-500 hover:text-rose-600"
                  title="Tải lại"
                >
                  Reload
                </button>
              </div>

              {loadingNoti ? (
                <div className="text-sm text-slate-500">Đang tải thông báo...</div>
              ) : errorNoti ? (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                  {errorNoti}
                </div>
              ) : latestNoti.length === 0 ? (
                <div className="text-sm text-slate-500">
                  Hiện chưa có thông báo nào.
                </div>
              ) : (
                <div className="space-y-3">
                  {latestNoti.map((n) => {
                    const unread = !n.is_read;
                    return (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (unread) markNotificationRead(n.id);
                          // ✅ nếu muốn mở trang chi tiết notification:
                          // navigate(`/author/notifications/${n.id}`)
                        }}
                        className={[
                          "w-full text-left p-4 rounded-xl border transition",
                          unread
                            ? "bg-rose-50/40 border-l-4 border-l-rose-400 border-rose-200 hover:bg-rose-50"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {n.subject || "(Không có tiêu đề)"}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {n.body || ""}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {unread && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                Mới
                              </span>
                            )}
                            <span className="text-[10px] text-rose-600 font-bold">
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900 mb-6">
                Mốc thời gian quan trọng
              </h3>

              <div className="space-y-4 text-sm text-slate-600">
                <div>
                  <div className="font-bold text-slate-900">Hết hạn nộp tóm tắt</div>
                  <div className="text-rose-600 font-bold">15/10/2024</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Hội nghị Khoa học UTH 2024
                  </div>
                </div>
                <div className="h-px bg-slate-100" />
                <div>
                  <div className="font-bold text-slate-900">Hết hạn nộp toàn văn</div>
                  <div className="font-bold">30/11/2024</div>
                  <div className="text-xs text-slate-500 mt-1">Hội nghị ICSET 2024</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl p-6 text-white shadow-xl shadow-rose-200">
              <h4 className="font-bold text-lg mb-2">Bạn cần hỗ trợ?</h4>
              <p className="text-sm text-rose-100 mb-4">
                Nếu gặp khó khăn trong quá trình nộp bài, hãy liên hệ Ban thư ký.
              </p>
              <button className="w-full py-3 bg-white text-rose-600 font-bold rounded-xl text-sm hover:bg-rose-50 transition">
                Gửi yêu cầu trợ giúp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, badge, tone }) {
  const toneMap = {
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">
        {title}
      </p>
      <p className="text-4xl font-black text-slate-900 mt-1">
        {String(value).padStart(2, "0")}
      </p>
      <div
        className={`mt-3 inline-flex items-center px-2 py-1 rounded text-xs font-bold ${toneMap[tone]}`}
      >
        {badge}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const st = normalizeStatus(status);
  const map = {
    SUBMITTED: "bg-amber-100 text-amber-700",
    UNDER_REVIEW: "bg-amber-100 text-amber-700",
    REVIEWING: "bg-amber-100 text-amber-700",
    ACCEPTED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    WITHDRAWN: "bg-slate-100 text-slate-600",
    REVISION_REQUIRED: "bg-rose-100 text-rose-700",
  };
  const cls = map[st] || "bg-slate-100 text-slate-600";
  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${cls}`}>
      {st || "UNKNOWN"}
    </span>
  );
}
