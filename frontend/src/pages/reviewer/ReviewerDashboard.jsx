// src/pages/reviewer/ReviewerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import reviewApi from "../../api/reviewApi";
import { useAuth } from "../../context/AuthContext";

const STATUS = {
  INVITED: "Invited",
  ACCEPTED: "Accepted",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  COI: "COI",
};

const STATUS_LABEL = {
  [STATUS.INVITED]: "Mời mới",
  [STATUS.ACCEPTED]: "Đã nhận",
  [STATUS.COMPLETED]: "Đã nộp review",
  [STATUS.DECLINED]: "Từ chối",
  [STATUS.COI]: "COI",
};

const TABS = [
  { key: STATUS.INVITED, label: "Mời mới" },
  { key: STATUS.ACCEPTED, label: "Đã nhận" },
  { key: STATUS.COMPLETED, label: "Đã nộp review" },
  { key: STATUS.DECLINED, label: "Từ chối" },
  { key: STATUS.COI, label: "COI" },
];

function normalizeStatus(raw) {
  const s = (raw ?? "").toString().trim().toLowerCase();
  if (s === "invited") return STATUS.INVITED;
  if (s === "accepted") return STATUS.ACCEPTED;
  if (s === "completed") return STATUS.COMPLETED;
  if (s === "declined") return STATUS.DECLINED;
  if (s === "coi" || s === "conflict" || s === "conflict_of_interest") return STATUS.COI;
  return STATUS.INVITED;
}

function formatDateVN(dueDate) {
  if (!dueDate) return "";
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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

function clampText(v, fallback = "") {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
}

function badgeByStatus(status) {
  switch (status) {
    case STATUS.INVITED:
      return "bg-blue-50 text-blue-700 border-blue-100";
    case STATUS.ACCEPTED:
      return "bg-amber-50 text-amber-700 border-amber-100";
    case STATUS.COMPLETED:
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case STATUS.DECLINED:
      return "bg-slate-100 text-slate-700 border-slate-200";
    case STATUS.COI:
      return "bg-rose-50 text-rose-700 border-rose-100";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default function ReviewerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const reviewerId = user?.id;

  const [active, setActive] = useState(STATUS.INVITED);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");

  const load = async () => {
    if (!reviewerId) return;
    setLoading(true);
    setErr("");
    try {
      const res = await reviewApi.listAssignments({ reviewerId });
      const raw = res?.data ?? [];

      const normalized = raw.map((x) => {
        const st = normalizeStatus(x.status);
        const dLeft = daysLeft(x.due_date);
        const overdue = dLeft !== null && dLeft < 0 && st !== STATUS.COMPLETED;
        return {
          ...x,
          status: st,
          __daysLeft: dLeft,
          __overdue: overdue,
        };
      });

      setItems(normalized);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewerId]);

  const counts = useMemo(() => {
    const c = {
      [STATUS.INVITED]: 0,
      [STATUS.ACCEPTED]: 0,
      [STATUS.COMPLETED]: 0,
      [STATUS.DECLINED]: 0,
      [STATUS.COI]: 0,
    };
    for (const x of items) c[x.status] = (c[x.status] || 0) + 1;
    return c;
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const invited = counts[STATUS.INVITED] ?? 0;
    const accepted = counts[STATUS.ACCEPTED] ?? 0;
    const completed = counts[STATUS.COMPLETED] ?? 0;
    const declined = counts[STATUS.DECLINED] ?? 0;
    const coi = counts[STATUS.COI] ?? 0;
    const overdue = items.filter((x) => x.__overdue).length;

    return { total, invited, accepted, completed, declined, coi, overdue };
  }, [items, counts]);

  const filtered = useMemo(() => {
    const list = items.filter((x) => x.status === active);
    const keyword = q.trim().toLowerCase();
    if (!keyword) return list;

    return list.filter((x) => {
      const title = (x.paper_title ?? x.title ?? "").toString().toLowerCase();
      const track = (x.track_name ?? x.track ?? "").toString().toLowerCase();
      const pid = (x.paper_id ?? "").toString().toLowerCase();
      const aid = (x.id ?? "").toString().toLowerCase();
      return title.includes(keyword) || track.includes(keyword) || pid.includes(keyword) || aid.includes(keyword);
    });
  }, [items, active, q]);

  // Actions
  const goAssignments = () => navigate("/reviewer/assignments");

  const onAccept = async (assignmentId) => {
    await reviewApi.updateAssignment(assignmentId, { status: STATUS.ACCEPTED });
    await load();
  };

  const onDecline = async (assignmentId) => {
    await reviewApi.updateAssignment(assignmentId, { status: STATUS.DECLINED });
    await load();
  };

  const onDeclareCOI = async (a) => {
    await reviewApi.declareCOI({
      paper_id: a.paper_id,
      reviewer_id: reviewerId,
      type: "Manual_Declared",
      description: "Reviewer declared COI",
    });
    await load();
  };

  return (
    <div className="bg-[#f6f8fb] text-slate-900 min-h-[calc(100vh-56px)]">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Reviewer Dashboard</h1>
            <p className="mt-2 text-slate-500">
              Quản lý lời mời phản biện, SLA, và thao tác review/discussion.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={goAssignments}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black bg-[#1976d2] text-white hover:opacity-95"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                list_alt
              </span>
              My Assignments
            </button>
          </div>
        </div>

        {/* Notice box */}
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="size-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
            <span className="material-symbols-outlined">info</span>
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-slate-900">Lưu ý quan trọng</div>
            <div className="text-sm text-slate-600 mt-1">
              Nếu bạn <b>Khai báo COI</b> thì hệ thống có thể <b>auto-decline</b> các lời mời liên quan (Invited/Accepted).
              Vui lòng đảm bảo đánh giá đúng quy định double-blind.
            </div>
          </div>
          <button
            onClick={() => navigate("/reviewer/coi")}
            className="hidden sm:inline-flex items-center gap-2 text-sm font-black text-[#1976d2] hover:underline"
            title="Đi tới trang COI"
          >
            Xem COI
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              open_in_new
            </span>
          </button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-sm text-slate-500 font-semibold">Tổng assignment</div>
            <div className="mt-2 text-4xl font-black">{stats.total}</div>
            <div className="mt-2 text-xs text-slate-500">
              Mời mới: <b>{stats.invited}</b> • Đã nhận: <b>{stats.accepted}</b>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-sm text-slate-500 font-semibold">Đã nộp review</div>
            <div className="mt-2 text-4xl font-black text-emerald-600">{stats.completed}</div>
            <div className="mt-2 text-xs text-slate-500">
              Từ chối: <b>{stats.declined}</b> • COI: <b>{stats.coi}</b>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-sm text-slate-500 font-semibold">SLA / Quá hạn</div>
            <div className="mt-2 text-4xl font-black">{stats.overdue}</div>
            <div className="mt-2 text-xs text-slate-500">
              Quá hạn khi <b>due_date &lt; hôm nay</b> và chưa “Completed”.
            </div>
          </div>
        </div>

        {/* Search + Tabs */}
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl">
          <div className="p-4 md:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="relative w-full md:max-w-[520px]">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                style={{ fontSize: 20 }}
              >
                search
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-[#1976d2]/20 focus:outline-none"
                placeholder="Tìm theo Paper ID / tiêu đề / track / assignment id..."
                type="text"
              />
            </div>

            <button
              onClick={load}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-black text-sm hover:bg-slate-50"
              title="Reload"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                refresh
              </span>
              Tải lại
            </button>
          </div>

          <div className="px-4 md:px-5 pt-2 border-b border-slate-200">
            <div className="flex gap-6 overflow-x-auto">
              {TABS.map((t) => {
                const isActive = active === t.key;
                const n = counts[t.key] ?? 0;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActive(t.key)}
                    className={
                      isActive
                        ? "py-3 text-sm font-black border-b-[3px] border-[#1976d2] text-[#1976d2] flex items-center gap-2"
                        : "py-3 text-sm font-bold border-b-[3px] border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2"
                    }
                  >
                    {t.label}
                    <span
                      className={
                        isActive
                          ? "bg-[#1976d2]/10 text-[#1976d2] px-2.5 py-0.5 rounded-full text-xs font-black"
                          : "bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-black"
                      }
                    >
                      {n}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="p-4 md:p-5">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">Đang tải...</div>
            ) : err ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <div className="font-black text-rose-700">{err}</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-14 text-center text-sm text-slate-500">
                Không có assignment nào trong tab này.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-600">
                      <th className="px-4 py-3 font-extrabold">Mã bài</th>
                      <th className="px-4 py-3 font-extrabold">Tiêu đề</th>
                      <th className="px-4 py-3 font-extrabold">Track</th>
                      <th className="px-4 py-3 font-extrabold">Deadline</th>
                      <th className="px-4 py-3 font-extrabold">Trạng thái</th>
                      <th className="px-4 py-3 font-extrabold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => {
                      const paperId = a.paper_id;
                      const assignmentId = a.id;

                      const title = clampText(a.paper_title ?? a.title, `Bài nộp #${paperId}`);
                      const track = clampText(a.track_name ?? a.track, "—");
                      const dueVN = formatDateVN(a.due_date);
                      const statusLabel = STATUS_LABEL[a.status] ?? a.status;

                      const canAcceptDecline = a.status === STATUS.INVITED;
                      const canReview = a.status === STATUS.ACCEPTED || a.status === STATUS.COMPLETED;

                      return (
                        <tr key={assignmentId} className="border-t border-slate-200">
                          <td className="px-4 py-3 font-black text-[#1976d2]">
                            #{paperId}
                            <div className="text-[11px] text-slate-400 font-semibold">
                              AID #{assignmentId}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-extrabold text-slate-900 line-clamp-2">{title}</div>
                          </td>

                          <td className="px-4 py-3 text-slate-700 font-semibold">{track}</td>

                          <td className="px-4 py-3 text-slate-700 font-semibold">
                            {dueVN || "—"}
                            {a.__daysLeft != null ? (
                              <div className={`text-[11px] font-black ${a.__daysLeft < 0 ? "text-rose-600" : "text-slate-400"}`}>
                                {a.__daysLeft < 0 ? `Quá hạn ${Math.abs(a.__daysLeft)} ngày` : `Còn ${a.__daysLeft} ngày`}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 font-semibold">Chưa có hạn</div>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-black ${badgeByStatus(a.status)}`}>
                              {statusLabel}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2 flex-wrap">
                              {canAcceptDecline ? (
                                <>
                                  <button
                                    onClick={() => onAccept(assignmentId)}
                                    className="px-3 py-2 rounded-lg bg-[#1976d2] text-white text-xs font-black hover:opacity-95"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => onDecline(assignmentId)}
                                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-black hover:bg-slate-50"
                                  >
                                    Decline
                                  </button>
                                  <button
                                    onClick={() => onDeclareCOI(a)}
                                    className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black hover:bg-rose-100/60"
                                    title="Khai COI sẽ auto-decline assignment liên quan"
                                  >
                                    COI
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => navigate(`/reviewer/assignments/${assignmentId}`)}
                                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-black hover:bg-slate-50"
                                  >
                                    Chi tiết
                                  </button>

                                  <button
                                    onClick={() => navigate(`/reviewer/discussion/${paperId}`)}
                                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-black hover:bg-slate-50"
                                  >
                                    Discussion
                                  </button>

                                  <button
                                    disabled={!canReview}
                                    onClick={() => navigate(`/reviewer/review/${assignmentId}`)}
                                    className={
                                      canReview
                                        ? "px-3 py-2 rounded-lg bg-[#1976d2] text-white text-xs font-black hover:opacity-95"
                                        : "px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-black cursor-not-allowed"
                                    }
                                  >
                                    Review
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
              <div>
                Hiển thị <b>{filtered.length}</b> mục trong tab <b>{STATUS_LABEL[active] || active}</b>
              </div>
              <button
                onClick={() => navigate("/reviewer/coi")}
                className="text-[#1976d2] font-black hover:underline"
              >
                Đi tới Khai báo COI →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
