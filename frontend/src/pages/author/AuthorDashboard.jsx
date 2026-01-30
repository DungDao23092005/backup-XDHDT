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

/** ====== UI token helpers ====== */
function SurfaceCard({ className = "", children, ...rest }) {
  return (
    <div
      {...rest}
      className={["rounded-2xl border shadow-sm", className].join(" ")}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {children}
    </div>
  );
}

function SubtleHeader({ className = "", children }) {
  return (
    <div
      className={["border-b", className].join(" ")}
      style={{
        borderColor: "rgb(255 255 255 / 0.06)",
      }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({ disabled, className = "", children, ...rest }) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={[
        "flex items-center gap-2 rounded-xl font-bold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
      style={{
        background: disabled ? "rgb(148 163 184 / 0.25)" : "var(--primary)",
        color: disabled ? "rgb(148 163 184 / 0.9)" : "#fff",
        boxShadow: disabled ? "none" : "0 12px 28px rgb(var(--primary-rgb) / 0.22)",
      }}
    >
      {children}
    </button>
  );
}

function LinkButton({ className = "", children, ...rest }) {
  return (
    <button
      {...rest}
      className={["text-sm font-semibold hover:underline", className].join(" ")}
      style={{ color: "var(--primary)" }}
    >
      {children}
    </button>
  );
}

function SoftPill({ children }) {
  return (
    <span
      className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full border"
      style={{
        background: "rgb(var(--primary-rgb) / 0.10)",
        color: "var(--primary)",
        borderColor: "rgb(var(--primary-rgb) / 0.25)",
      }}
    >
      {children}
    </span>
  );
}

export default function AuthorDashboard() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // notifications state
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

  const loadNotifications = useCallback(async () => {
    try {
      setErrorNoti("");
      setLoadingNoti(true);

      const res = await notificationApi.getMyInbox();
      const data = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
        ? res.items
        : [];

      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotiItems(data);
    } catch (e) {
      console.error("Load notifications error:", e);
      setErrorNoti(e?.response?.data?.detail || e?.message || "Không tải được thông báo");
      setNotiItems([]);
    } finally {
      setLoadingNoti(false);
    }
  }, []);

  const markNotificationRead = useCallback(async (messageId) => {
    try {
      await notificationApi.markRead(messageId);
      setNotiItems((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m)));
    } catch (e) {
      console.error("Mark read error:", e);
    }
  }, []);

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

  const latestNoti = useMemo(() => notiItems.slice(0, 3), [notiItems]);
  const unreadCount = useMemo(() => notiItems.filter((n) => !n.is_read).length, [notiItems]);

  return (
    <div style={{ background: "var(--bg)" }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight" style={{ color: "var(--text)" }}>
              Chào mừng trở lại, Tác giả!
            </h2>
            <p className="mt-1" style={{ color: "var(--muted)" }}>
              Xem lại tiến độ bài viết và các mốc thời gian quan trọng của bạn.
            </p>
          </div>

          <PrimaryButton onClick={() => navigate("/author/submit")} className="px-6 h-12">
            <span className="text-lg">＋</span>
            <span>Nộp bài mới</span>
          </PrimaryButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard
            title="Tổng số bài đã nộp"
            value={stats.total}
            badge={`+${Math.min(stats.total, 2)} tháng này`}
            tone="green"
          />
          <StatCard title="Bài đang đánh giá" value={stats.underReview} badge="Chờ phản biện" tone="amber" />
          <StatCard title="Đã được chấp nhận" value={stats.accepted} badge={`Tỉ lệ chấp nhận ${stats.rate}%`} tone="primary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Submissions */}
            <SurfaceCard className="overflow-hidden">
              <div className="px-6 py-5 border-b flex justify-between items-center" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>
                  Bài nộp gần đây
                </h3>
                <LinkButton onClick={() => navigate("/author/submissions")}>Xem tất cả</LinkButton>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ background: "rgb(var(--primary-rgb) / 0.04)" }}>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                        Tiêu đề
                      </th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                        Hội nghị
                      </th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-center" style={{ color: "var(--muted)" }}>
                        Trạng thái
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {loading ? (
                      <tr>
                        <td className="px-6 py-6" style={{ color: "var(--muted)" }} colSpan={3}>
                          Đang tải...
                        </td>
                      </tr>
                    ) : recent.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6" style={{ color: "var(--muted)" }} colSpan={3}>
                          Chưa có bài nào. Hãy bấm “Nộp bài mới”.
                        </td>
                      </tr>
                    ) : (
                      recent.map((p) => (
                        <tr
                          key={p.id}
                          className="transition"
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.04)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold line-clamp-1" style={{ color: "var(--text)" }}>
                                {p.title || "(Không có tiêu đề)"}
                              </span>
                              <span className="text-xs" style={{ color: "var(--muted)" }}>
                                Nộp ngày: {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : "---"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm" style={{ color: "var(--muted)" }}>
                              {p.conference_name || p.conference?.name || `#${p.conference_id ?? "-"}`}
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
            </SurfaceCard>

            {/* Notifications */}
            <SurfaceCard className="p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--primary)" }}>📣</span>
                  <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>
                    Thông báo mới
                  </h3>
                  {unreadCount > 0 && <SoftPill>{unreadCount} chưa đọc</SoftPill>}
                </div>

                <button
                  onClick={loadNotifications}
                  className="text-xs font-semibold"
                  style={{ color: "var(--muted)" }}
                  title="Tải lại"
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                >
                  Reload
                </button>
              </div>

              {loadingNoti ? (
                <div className="text-sm" style={{ color: "var(--muted)" }}>
                  Đang tải thông báo...
                </div>
              ) : errorNoti ? (
                <div
                  className="text-sm rounded-xl p-3 border"
                  style={{
                    background: "rgb(244 63 94 / 0.12)",
                    borderColor: "rgb(244 63 94 / 0.25)",
                    color: "rgb(244 63 94 / 0.95)",
                  }}
                >
                  {errorNoti}
                </div>
              ) : latestNoti.length === 0 ? (
                <div className="text-sm" style={{ color: "var(--muted)" }}>
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
                          // nếu muốn mở trang notifications:
                          // navigate("/author/notifications");
                        }}
                        className="w-full text-left p-4 rounded-xl border transition"
                        style={{
                          borderColor: unread ? "rgb(var(--primary-rgb) / 0.25)" : "var(--border)",
                          background: unread ? "rgb(var(--primary-rgb) / 0.08)" : "var(--surface-2)",
                          boxShadow: unread ? "0 10px 25px rgb(var(--primary-rgb) / 0.10)" : "none",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.10)")}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = unread ? "rgb(var(--primary-rgb) / 0.08)" : "var(--surface-2)")
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                              {n.subject || "(Không có tiêu đề)"}
                            </h4>
                            <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>
                              {n.body || ""}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {unread && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                style={{
                                  background: "rgb(var(--primary-rgb) / 0.12)",
                                  color: "var(--primary)",
                                  borderColor: "rgb(var(--primary-rgb) / 0.25)",
                                }}
                              >
                                Mới
                              </span>
                            )}
                            <span className="text-[10px] font-bold" style={{ color: "var(--primary)" }}>
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </SurfaceCard>
          </div>

          {/* Right column */}
          <div className="space-y-8">
            <SurfaceCard className="p-6">
              <h3 className="font-bold text-lg mb-6" style={{ color: "var(--text)" }}>
                Mốc thời gian quan trọng
              </h3>

              <div className="space-y-4 text-sm" style={{ color: "var(--muted)" }}>
                <div>
                  <div className="font-bold" style={{ color: "var(--text)" }}>
                    Hết hạn nộp tóm tắt
                  </div>
                  <div className="font-bold" style={{ color: "var(--primary)" }}>
                    15/10/2024
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    Hội nghị Khoa học UTH 2024
                  </div>
                </div>

                <div className="h-px" style={{ background: "var(--border)" }} />

                <div>
                  <div className="font-bold" style={{ color: "var(--text)" }}>
                    Hết hạn nộp toàn văn
                  </div>
                  <div className="font-bold" style={{ color: "var(--text)" }}>
                    30/11/2024
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    Hội nghị ICSET 2024
                  </div>
                </div>
              </div>
            </SurfaceCard>

            {/* Support card: thay gradient rose hard-code -> gradient theo primary */}
            <div
              className="rounded-2xl p-6 text-white shadow-xl"
              style={{
                background: `linear-gradient(135deg, rgb(var(--primary-rgb) / 0.95), rgb(var(--primary-rgb) / 0.70))`,
                boxShadow: "0 18px 40px rgb(var(--primary-rgb) / 0.22)",
              }}
            >
              <h4 className="font-bold text-lg mb-2">Bạn cần hỗ trợ?</h4>
              <p className="text-sm mb-4" style={{ color: "rgb(255 255 255 / 0.85)" }}>
                Nếu gặp khó khăn trong quá trình nộp bài, hãy liên hệ Ban thư ký.
              </p>
              <button
                className="w-full py-3 font-bold rounded-xl text-sm transition"
                style={{
                  background: "rgb(255 255 255 / 0.95)",
                  color: "var(--primary)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(255 255 255 / 0.88)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgb(255 255 255 / 0.95)")}
              >
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
  // tone: green | amber | primary
  const toneStyle =
    tone === "green"
      ? { bg: "rgb(34 197 94 / 0.12)", bd: "rgb(34 197 94 / 0.25)", tx: "rgb(34 197 94 / 0.95)" }
      : tone === "amber"
      ? { bg: "rgb(245 158 11 / 0.12)", bd: "rgb(245 158 11 / 0.25)", tx: "rgb(245 158 11 / 0.95)" }
      : { bg: "rgb(var(--primary-rgb) / 0.10)", bd: "rgb(var(--primary-rgb) / 0.25)", tx: "var(--primary)" };

  return (
    <div className="rounded-2xl p-6 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
        {title}
      </p>
      <p className="text-4xl font-black mt-1" style={{ color: "var(--text)" }}>
        {String(value).padStart(2, "0")}
      </p>
      <div
        className="mt-3 inline-flex items-center px-2 py-1 rounded text-xs font-bold border"
        style={{ background: toneStyle.bg, borderColor: toneStyle.bd, color: toneStyle.tx }}
      >
        {badge}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const st = normalizeStatus(status);

  // Giữ semantic (xanh/amber/đỏ) cho status, nhưng nền/viền vẫn “mềm” và hợp dark mode
  const map = {
    SUBMITTED: { bg: "rgb(245 158 11 / 0.14)", bd: "rgb(245 158 11 / 0.28)", tx: "rgb(245 158 11 / 0.95)" },
    UNDER_REVIEW: { bg: "rgb(245 158 11 / 0.14)", bd: "rgb(245 158 11 / 0.28)", tx: "rgb(245 158 11 / 0.95)" },
    REVIEWING: { bg: "rgb(245 158 11 / 0.14)", bd: "rgb(245 158 11 / 0.28)", tx: "rgb(245 158 11 / 0.95)" },

    ACCEPTED: { bg: "rgb(34 197 94 / 0.14)", bd: "rgb(34 197 94 / 0.28)", tx: "rgb(34 197 94 / 0.95)" },

    REJECTED: { bg: "rgb(239 68 68 / 0.14)", bd: "rgb(239 68 68 / 0.28)", tx: "rgb(239 68 68 / 0.95)" },

    WITHDRAWN: { bg: "rgb(148 163 184 / 0.18)", bd: "rgb(148 163 184 / 0.30)", tx: "rgb(148 163 184 / 0.95)" },

    REVISION_REQUIRED: { bg: "rgb(var(--primary-rgb) / 0.12)", bd: "rgb(var(--primary-rgb) / 0.25)", tx: "var(--primary)" },
  };

  const t = map[st] || { bg: "rgb(148 163 184 / 0.18)", bd: "rgb(148 163 184 / 0.30)", tx: "rgb(148 163 184 / 0.95)" };

  return (
    <span
      className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight border"
      style={{ background: t.bg, borderColor: t.bd, color: t.tx }}
    >
      {st || "UNKNOWN"}
    </span>
  );
}
