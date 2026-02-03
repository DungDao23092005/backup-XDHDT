// src/pages/reviewer/MyAssignments.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import reviewApi from "../../api/reviewApi";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import notificationApi from "../../api/notificationApi";

// Helper hiển thị Badge trạng thái (ASSIGNMENT)
const statusBadge = (status) => {
  const s = (status || "").toLowerCase();

  if (s === "invited") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
        <span className="size-1.5 rounded-full bg-blue-500 animate-pulse"></span>
        Mời mới
      </span>
    );
  }
  if (s === "accepted") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
        <span className="size-1.5 rounded-full bg-amber-500"></span>
        Đang chấm
      </span>
    );
  }
  if (s === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <span className="material-symbols-outlined text-sm">check_circle</span>
        Hoàn thành
      </span>
    );
  }
  if (s === "coi" || s === "declined") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
        <span className="material-symbols-outlined text-xs">block</span>
        {s === "coi" ? "COI" : "Đã từ chối"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
      {status || "Unknown"}
    </span>
  );
};

// Badge trạng thái cho INVITE
const inviteStatusBadge = (stRaw) => {
  const st = (stRaw || "PENDING").toUpperCase();
  const cls =
    st === "ACCEPTED"
      ? "bg-green-100 text-green-700 border border-green-200"
      : st === "DECLINED"
      ? "bg-red-100 text-red-700 border border-red-200"
      : "bg-amber-100 text-amber-700 border border-amber-200";

  const label = st === "PENDING" ? "Mời mới" : st === "ACCEPTED" ? "Đã chấp nhận" : "Đã từ chối";

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${cls}`}>
      {label}
    </span>
  );
};

export default function MyAssignments() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  // COI States
  // [FIX] Removed unused openCoiPaperIds state
  const [resolvingByPaperId, setResolvingByPaperId] = useState({});

  // Tabs cho ASSIGNMENTS
  const [tab, setTab] = useState("all");

  // Tabs cho INVITES
  const [inviteTab, setInviteTab] = useState("all"); // all | pending | accepted | declined

  // --- HÀM KIỂM TRA QUÁ HẠN ---
  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date() > new Date(dateStr);
  };

  const handleAcceptInvite = async (invId) => {
    try {
      await notificationApi.acceptReviewerInvitation(invId);
      toast.success("✅ Đã chấp nhận lời mời reviewer!");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Accept thất bại");
    }
  };

  const handleDeclineInvite = async (invId) => {
    if (!window.confirm("Bạn chắc chắn muốn từ chối lời mời này?")) return;
    try {
      await notificationApi.declineReviewerInvitation(invId);
      toast.info("Đã từ chối lời mời.");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Decline thất bại");
    }
  };

  const load = async () => {
    if (!user) return;

    setLoading(true);
    setErr("");

    // load invites (riêng)
    setLoadingInvites(true);
    try {
      const invRes = await notificationApi.getMyReviewerInvitations();
      const invList = Array.isArray(invRes) ? invRes : (invRes?.data || []);
      setInvites(invList);
    } catch (e) {
      setInvites([]);
    } finally {
      setLoadingInvites(false);
    }

    try {
      // 1. List Assignments
      const res = await reviewApi.listAssignments({ reviewerId: user.id });
      const assignments = Array.isArray(res) ? res : (res?.data || []);

      // 2. List COI
      const coiRes = await reviewApi.listMyCOI();
      const myCoi = Array.isArray(coiRes) ? coiRes : (coiRes?.data || []);
      const openSet = new Set(
        myCoi
          .filter((c) => (c.status?.value ?? c.status ?? "").toLowerCase() === "open")
          .map((c) => c.paper_id)
      );
      // [FIX] Removed setOpenCoiPaperIds(openSet)

      // 3. Enrich Data (Check Submitted)
      const enrichedAssignments = await Promise.all(
        assignments.map(async (a) => {
          let aStatus = (a.status?.value ?? a.status ?? "").toString();

          // Nếu Accepted -> Check review submitted
          if (aStatus.toLowerCase() === "accepted") {
            try {
              const reviewsRes = await reviewApi.listReviews({ assignmentId: a.id });
              const reviews = Array.isArray(reviewsRes) ? reviewsRes : (reviewsRes?.data || []);
              const myReview = reviews[0];
              if (myReview && (myReview.is_draft === false || myReview.submitted_at)) {
                aStatus = "Completed";
              }
            } catch (ignore) {}
          }

          const isCompleted = aStatus.toLowerCase() === "completed";
          const blockedByCoi = openSet.has(a.paper_id) && !isCompleted;

          return {
            ...a,
            _ui_status: blockedByCoi ? "COI" : aStatus,
            _blockedByCoi: blockedByCoi,
          };
        })
      );

      // Sort: Invited lên đầu, sau đó đến Accepted
      enrichedAssignments.sort((a, b) => {
        const score = (s) => {
          s = (s || "").toLowerCase();
          if (s === "invited") return 0;
          if (s === "accepted") return 1;
          return 2;
        };
        return score(a._ui_status) - score(b._ui_status);
      });

      setItems(enrichedAssignments);
      
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Không tải được assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // --- Handlers (assignment) ---
  const handleAccept = async (assignmentId) => {
    try {
      await reviewApi.acceptAssignment(assignmentId);
      toast.success("Đã nhận bài chấm!");
      await load();
    } catch (e) {
      toast.error("Lỗi: " + e.message);
    }
  };

  const handleDecline = async (assignmentId) => {
    if (!window.confirm("Bạn chắc chắn muốn từ chối chấm bài này?")) return;
    try {
      await reviewApi.declineAssignment(assignmentId);
      toast.info("Đã từ chối.");
      await load();
    } catch (e) {
      toast.error("Lỗi: " + e.message);
    }
  };

  const handleDeclareCOI = async () => {
    navigate("/reviewer/coi");
  };

  const handleResolveCoiAndAccept = async (paperId, assignmentId) => {
    try {
      setErr("");
      setResolvingByPaperId((p) => ({ ...p, [paperId]: true }));
      let list = [];
      try {
        const res = await reviewApi.listMyCOI();
        list = (res.data || []).filter((x) => x.paper_id === paperId);
      } catch (e) {}
      const open = list.find((x) => (x.status || "").toString().toLowerCase() === "open");
      if (!open) throw new Error("Không tìm thấy COI Open.");
      await reviewApi.updateCOI(open.id, { status: "Resolved" });
      await reviewApi.acceptAssignment(assignmentId);
      await load();
    } catch (e) {
      setErr("Gỡ COI thất bại: " + e.message);
    } finally {
      setResolvingByPaperId((p) => ({ ...p, [paperId]: false }));
    }
  };

  // ====== computed ASSIGNMENTS ======
  const computed = useMemo(() => {
    const all = items || [];

    const invited = all.filter((x) => (x._ui_status || "").toLowerCase() === "invited");
    const todo = all.filter((x) => (x._ui_status || "").toLowerCase() === "accepted");
    const done = all.filter((x) => (x._ui_status || "").toLowerCase() === "completed");
    const blocked = all.filter((x) => ["coi", "declined"].includes((x._ui_status || "").toLowerCase()));

    const current =
      tab === "invited"
        ? invited
        : tab === "todo"
        ? todo
        : tab === "done"
        ? done
        : tab === "blocked"
        ? blocked
        : all;

    return { all, invited, todo, done, blocked, current };
  }, [items, tab]);

  // ====== computed INVITES (riêng) ======
  const inviteComputed = useMemo(() => {
    const allInv = invites || [];
    const pending = allInv.filter((x) => (x.status || "").toUpperCase() === "PENDING");
    const accepted = allInv.filter((x) => (x.status || "").toUpperCase() === "ACCEPTED");
    const declined = allInv.filter((x) => (x.status || "").toUpperCase() === "DECLINED");

    const current =
      inviteTab === "pending"
        ? pending
        : inviteTab === "accepted"
        ? accepted
        : inviteTab === "declined"
        ? declined
        : allInv;

    return { allInv, pending, accepted, declined, current };
  }, [invites, inviteTab]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Danh sách bài báo</h2>
        <p className="text-slate-500 mt-2">Tất cả bài báo đã được phân công cho bạn.</p>
      </div>

      {err && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm font-bold text-rose-700">
          {err}
        </div>
      )}

      {/* ================== TABLE 1: ASSIGNMENTS (GIỮ NGUYÊN) ================== */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100 min-w-[280px]">
                  Bài báo
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100 text-center">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100 text-center">
                  Hạn chót
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* Tabs nằm trong table */}
              <tr>
                <td colSpan={5} className="px-6 py-3 bg-white border-b border-slate-100">
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto w-fit">
                    {[
                      { k: "all", l: "Tất cả", c: computed.all.length },
                      { k: "invited", l: "Mời mới", c: computed.invited.length },
                      { k: "todo", l: "Đang chấm", c: computed.todo.length },
                      { k: "done", l: "Hoàn thành", c: computed.done.length },
                      { k: "blocked", l: "Đã xong/Chặn", c: computed.blocked.length },
                    ].map((t) => (
                      <button
                        key={t.k}
                        onClick={() => setTab(t.k)}
                        className={`px-4 py-1.5 text-sm rounded-md transition-all whitespace-nowrap ${
                          tab === t.k
                            ? "font-bold bg-white shadow-sm text-primary"
                            : "font-medium text-slate-500 hover:text-slate-700"
                        }`}
                        type="button"
                      >
                        {t.l} <span className="opacity-60 text-xs ml-1">({t.c})</span>
                      </button>
                    ))}
                  </div>
                </td>
              </tr>


              
              {loading ? (

                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={5}>
                    Đang tải...
                  </td>
                </tr>
              ) : computed.current.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={5}>
                    Trống.
                  </td>
                </tr>
              ) : (
                computed.current.map((a) => {
                  const s = (a._ui_status || "").toLowerCase();
                  const isBlocked = s === "coi" || s === "declined";
                  const isDone = s === "completed";
                  const isAccepted = s === "accepted";
                  const isInvited = s === "invited";

                  
                  const expired = isOverdue(a.due_date);

                  return (
                    <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${isBlocked ? "bg-red-50/20" : ""}`}>
                      <td className="px-6 py-4 text-sm font-mono font-bold text-slate-400">#{a.id}</td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 line-clamp-1">
                            {a.paper_title || a.title || `Paper #${a.paper_id}`}
                          </span>
                          <span className="text-xs text-slate-400 mt-1">Paper ID: {a.paper_id}</span>
                          {a._blockedByCoi && (
                            <span className="mt-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded w-fit">
                              Bị chặn bởi COI
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">{statusBadge(a._ui_status)}</td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-sm font-medium ${
                            isBlocked ? "text-slate-400 line-through" : expired ? "text-rose-600 font-bold" : "text-slate-600"
                          }`}
                        >
                          {a.due_date ? new Date(a.due_date).toLocaleDateString("vi-VN") : "—"}
                          {expired && !isDone && !isBlocked && <span className="block text-[10px] text-rose-500">(Quá hạn)</span>}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {isInvited &&
                            (expired ? (
                              <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded border border-rose-100 whitespace-nowrap">
                                Đã hết hạn trả lời
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleAccept(a.id)}
                                  className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition"
                                  type="button"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleDecline(a.id)}
                                  className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                                  type="button"
                                >
                                  Decline
                                </button>
                                <button
                                  onClick={() => handleDeclareCOI(a.paper_id)}
                                  className="px-3 py-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition"
                                  title="Khai báo Xung đột lợi ích"
                                  type="button"
                                >
                                  COI
                                </button>
                              </>
                            ))}

                          {isBlocked && a._blockedByCoi && (
                            <button
                              onClick={() => handleResolveCoiAndAccept(a.paper_id, a.id)}
                              className="px-3 py-1.5 rounded bg-white border border-red-200 text-red-700 text-xs font-bold hover:bg-red-50"
                              type="button"
                            >
                              {resolvingByPaperId[a.paper_id] ? "Đang xử lý..." : "Gỡ COI"}
                            </button>
                          )}

                          {isDone && (
                            <button
                              onClick={() => navigate(`/reviewer/assignments/${a.id}`)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all shadow-sm"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              Xem lại
                            </button>
                          )}

                          {isAccepted && (
                            <button
                              onClick={() => navigate(`/reviewer/review/${a.id}`)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md ${
                                expired ? "bg-rose-600 hover:bg-rose-700" : "bg-primary hover:bg-primary/90"
                              }`}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-sm">rate_review</span>
                              {expired ? "Chấm (Trễ hạn)" : "Bắt đầu chấm"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200">
          <span>Hiển thị {computed.current.length} bản ghi</span>
        </div>
      </div>

      {/* ================== TABLE 2: INVITES (MỚI - BÊN DƯỚI) ================== */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-900">Thông báo lời mời phản biện</h3>
          <p className="text-sm text-slate-500 mt-1">Nhận lời mời từ Chair để tham gia role Reviewer.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                  Người gửi
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                  Lời nhắn
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100 text-center">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* Tabs của INVITES */}
              <tr>
                <td colSpan={4} className="px-6 py-3 bg-white border-b border-slate-100">
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto w-fit">
                    {[
                      { k: "all", l: "Tất cả", c: inviteComputed.allInv.length },
                      { k: "pending", l: "Lời mời mới", c: inviteComputed.pending.length },
                      { k: "accepted", l: "Đã chấp nhận", c: inviteComputed.accepted.length },
                      { k: "declined", l: "Đã từ chối", c: inviteComputed.declined.length },
                    ].map((t) => (
                      <button
                        key={t.k}
                        onClick={() => setInviteTab(t.k)}
                        className={`px-4 py-1.5 text-sm rounded-md transition-all whitespace-nowrap ${
                          inviteTab === t.k
                            ? "font-bold bg-white shadow-sm text-primary"
                            : "font-medium text-slate-500 hover:text-slate-700"
                        }`}
                        type="button"
                      >
                        {t.l} <span className="opacity-60 text-xs ml-1">({t.c})</span>
                      </button>
                    ))}
                  </div>
                </td>
              </tr>

              {loadingInvites ? (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={4}>
                    Đang tải lời mời...
                  </td>
                </tr>
              ) : inviteComputed.current.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={4}>
                    Không có lời mời.
                  </td>
                </tr>
              ) : (
                inviteComputed.current.map((inv) => {
                  const st = (inv.status || "PENDING").toUpperCase();
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">Chair</div>
                        <div className="text-xs text-slate-400">Hệ thống mời phản biện</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-800 line-clamp-2">
                          {inv.description || "Bạn được mời tham gia phản biện (role REVIEWER)."}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Tới: <b>{inv.reviewer_email}</b>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">{inviteStatusBadge(st)}</td>

                      <td className="px-6 py-4 text-right">
                        {st === "PENDING" ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleAcceptInvite(inv.id)}
                              className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition"
                              type="button"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineInvite(inv.id)}
                              className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                              type="button"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-500">Đã phản hồi</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200">
          <span>Hiển thị {inviteComputed.current.length} lời mời</span>
        </div>
      </div>
    </div>
  );
}