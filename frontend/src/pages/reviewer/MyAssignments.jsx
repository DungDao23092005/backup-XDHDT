import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import reviewApi from "../../api/reviewApi";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify"; // Nhớ import toast để thông báo kết quả

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

export default function MyAssignments() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  // COI States
  const [openCoiPaperIds, setOpenCoiPaperIds] = useState(new Set());
  const [resolvingByPaperId, setResolvingByPaperId] = useState({});

  // Filter Tabs
  const [tab, setTab] = useState("all"); 

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setErr("");

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
      setOpenCoiPaperIds(openSet);

      // 3. Enrich Data (Check Submitted)
      const enrichedAssignments = await Promise.all(assignments.map(async (a) => {
        let aStatus = (a.status?.value ?? a.status ?? "").toString();
        
        // Nếu Accepted -> Check review submitted
        if (aStatus.toLowerCase() === 'accepted') {
            try {
                const reviewsRes = await reviewApi.listReviews({ assignmentId: a.id });
                const reviews = Array.isArray(reviewsRes) ? reviewsRes : (reviewsRes?.data || []);
                const myReview = reviews[0];
                if (myReview && (myReview.is_draft === false || myReview.submitted_at)) {
                    aStatus = "Completed"; 
                }
            } catch (ignore) { }
        }

        const isCompleted = aStatus.toLowerCase() === "completed";
        const blockedByCoi = openSet.has(a.paper_id) && !isCompleted;

        return {
          ...a,
          _ui_status: blockedByCoi ? "COI" : aStatus,
          _blockedByCoi: blockedByCoi,
        };
      }));

      // Sort: Invited lên đầu, sau đó đến Accepted
      enrichedAssignments.sort((a, b) => {
         const score = (s) => {
            s = (s || "").toLowerCase();
            if(s === "invited") return 0;
            if(s === "accepted") return 1;
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

  // --- Handlers ---

  const handleAccept = async (assignmentId) => {
    try {
        await reviewApi.acceptAssignment(assignmentId);
        toast.success("Đã nhận bài chấm!");
        await load();
    } catch(e) {
        toast.error("Lỗi: " + e.message);
    }
  };

  const handleDecline = async (assignmentId) => {
    if(!window.confirm("Bạn chắc chắn muốn từ chối chấm bài này?")) return;
    try {
        await reviewApi.declineAssignment(assignmentId);
        toast.info("Đã từ chối.");
        await load();
    } catch(e) {
        toast.error("Lỗi: " + e.message);
    }
  };

  const handleDeclareCOI = async (paperId) => {
    // Điều hướng sang trang khai báo COI, truyền state nếu cần hoặc để user tự chọn
    // Ở đây đơn giản nhất là chuyển hướng user
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

  const computed = useMemo(() => {
    const all = items || [];
    
    // --- CẬP NHẬT LOGIC LỌC TAB ---
    const invited = all.filter((x) => (x._ui_status || "").toLowerCase() === "invited");
    const todo = all.filter((x) => (x._ui_status || "").toLowerCase() === "accepted");
    const done = all.filter((x) => (x._ui_status || "").toLowerCase() === "completed");
    const blocked = all.filter((x) => ["coi", "declined"].includes((x._ui_status || "").toLowerCase()));

    const current =
      tab === "invited" ? invited :
      tab === "todo" ? todo : 
      tab === "done" ? done : 
      tab === "blocked" ? blocked : all;

    return { all, invited, todo, done, blocked, current };
  }, [items, tab]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Danh sách bài báo
        </h2>
        <p className="text-slate-500 mt-2">
          Tất cả các lời mời và bài báo đã được phân công cho bạn.
        </p>
      </div>

      {err && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm font-bold text-rose-700">
          {err}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between p-4 gap-4 border-b border-slate-100">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {[
                {k: "all", l: "Tất cả", c: computed.all.length},
                {k: "invited", l: "Mời mới", c: computed.invited.length}, // <--- TAB MỚI
                {k: "todo", l: "Đang chấm", c: computed.todo.length},
                {k: "done", l: "Hoàn thành", c: computed.done.length},
                {k: "blocked", l: "Đã xong/Chặn", c: computed.blocked.length}
            ].map(t => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-all whitespace-nowrap ${
                    tab === t.k
                      ? "font-bold bg-white shadow-sm text-primary"
                      : "font-medium text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.l} <span className="opacity-60 text-xs ml-1">({t.c})</span>
                </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100 min-w-[280px]">Bài báo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100 text-center">Hạn chót</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-100 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-6 py-10 text-center text-slate-500" colSpan={5}>Đang tải...</td></tr>
              ) : computed.current.length === 0 ? (
                <tr><td className="px-6 py-10 text-center text-slate-500" colSpan={5}>Trống.</td></tr>
              ) : (
                computed.current.map((a) => {
                  const s = (a._ui_status || "").toLowerCase();
                  const isBlocked = s === "coi" || s === "declined";
                  const isDone = s === "completed";
                  const isAccepted = s === "accepted";
                  const isInvited = s === "invited"; // Check Invited

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
                        <span className={`text-sm font-medium ${isBlocked ? "text-slate-400 line-through" : "text-slate-600"}`}>
                          {a.due_date ? new Date(a.due_date).toLocaleDateString("vi-VN") : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                            
                            {/* --- TRƯỜNG HỢP 1: MỜI MỚI (INVITED) --- */}
                            {isInvited && (
                                <>
                                    <button 
                                        onClick={() => handleAccept(a.id)}
                                        className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition"
                                    >
                                        Accept
                                    </button>
                                    <button 
                                        onClick={() => handleDecline(a.id)}
                                        className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                                    >
                                        Decline
                                    </button>
                                    <button 
                                        onClick={() => handleDeclareCOI(a.paper_id)}
                                        className="px-3 py-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition"
                                        title="Khai báo Xung đột lợi ích"
                                    >
                                        COI
                                    </button>
                                </>
                            )}

                            {/* --- TRƯỜNG HỢP 2: BỊ CHẶN (COI) --- */}
                            {isBlocked && a._blockedByCoi && (
                                <button
                                  onClick={() => handleResolveCoiAndAccept(a.paper_id, a.id)}
                                  className="px-3 py-1.5 rounded bg-white border border-red-200 text-red-700 text-xs font-bold hover:bg-red-50"
                                >
                                  {resolvingByPaperId[a.paper_id] ? "Đang xử lý..." : "Gỡ COI"}
                                </button>
                            )}

                            {/* --- TRƯỜNG HỢP 3: HOÀN THÀNH (DONE) --- */}
                            {isDone && (
                                <button
                                    onClick={() => navigate(`/reviewer/assignments/${a.id}`)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                    Xem lại
                                </button>
                            )}

                            {/* --- TRƯỜNG HỢP 4: ĐANG CHẤM (ACCEPTED) --- */}
                            {isAccepted && (
                                <button
                                    onClick={() => navigate(`/reviewer/review/${a.id}`)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md"
                                >
                                    <span className="material-symbols-outlined text-sm">rate_review</span>
                                    Bắt đầu chấm
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
        
        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200">
           <span>Hiển thị {computed.current.length} bản ghi</span>
        </div>
      </div>
    </div>
  );
}