import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import reviewApi from "../../api/reviewApi";

const statusBadge = (status) => {
  const s = (status || "").toLowerCase();

  if (s === "accepted") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
        <span className="size-1.5 rounded-full bg-blue-500"></span>
        Accepted
      </span>
    );
  }
  if (s === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
        <span className="size-1.5 rounded-full bg-emerald-500"></span>
        Completed
      </span>
    );
  }
  if (s === "coi" || s === "declined") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
        <span className="material-symbols-outlined text-xs">block</span>
        Bị chặn
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
      {status || "Unknown"}
    </span>
  );
};

export default function MyAssignments() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  const [tab, setTab] = useState("all"); // all | todo | done | blocked

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      // endpoint này bạn đã có: GET /review/assignments/
      const res = await reviewApi.listMyAssignments();
      setItems(res.data || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Không tải được assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const computed = useMemo(() => {
    const all = items || [];
    const todo = all.filter((x) => (x.status || "").toLowerCase() === "accepted");
    const done = all.filter((x) => (x.status || "").toLowerCase() === "completed");
    const blocked = all.filter((x) => {
      const s = (x.status || "").toLowerCase();
      return s === "coi" || s === "declined";
    });

    const current =
      tab === "todo" ? todo : tab === "done" ? done : tab === "blocked" ? blocked : all;

    return { all, todo, done, blocked, current };
  }, [items, tab]);

  return (
    <div>
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Danh sách bài báo cần chấm điểm
        </h2>
        <p className="text-slate-500 mt-2">
          Quản lý và thực hiện đánh giá các bài báo khoa học được phân công.
        </p>
      </div>

      {err ? (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-sm font-bold text-rose-700">{err}</p>
        </div>
      ) : null}

      {/* Filters & Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="flex flex-wrap items-center justify-between p-4 gap-4 border-b border-slate-100">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setTab("all")}
              className={`px-4 py-1.5 text-sm rounded-md ${
                tab === "all"
                  ? "font-bold bg-white shadow-sm text-primary"
                  : "font-medium text-slate-500 hover:text-slate-700"
              }`}
            >
              Tất cả ({computed.all.length})
            </button>
            <button
              onClick={() => setTab("todo")}
              className={`px-4 py-1.5 text-sm rounded-md ${
                tab === "todo"
                  ? "font-bold bg-white shadow-sm text-primary"
                  : "font-medium text-slate-500 hover:text-slate-700"
              }`}
            >
              Chưa chấm ({computed.todo.length})
            </button>
            <button
              onClick={() => setTab("done")}
              className={`px-4 py-1.5 text-sm rounded-md ${
                tab === "done"
                  ? "font-bold bg-white shadow-sm text-primary"
                  : "font-medium text-slate-500 hover:text-slate-700"
              }`}
            >
              Hoàn thành ({computed.done.length})
            </button>
            <button
              onClick={() => setTab("blocked")}
              className={`px-4 py-1.5 text-sm rounded-md ${
                tab === "blocked"
                  ? "font-bold bg-white shadow-sm text-primary"
                  : "font-medium text-slate-500 hover:text-slate-700"
              }`}
            >
              Bị chặn ({computed.blocked.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select className="bg-slate-100 border-none rounded-lg text-sm font-medium px-4 py-2 focus:ring-2 focus:ring-primary/20">
              <option>Sắp xếp: Mới nhất</option>
              <option>Hạn chót gần nhất</option>
            </select>
            <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all">
              <span className="material-symbols-outlined text-sm font-bold">
                filter_alt
              </span>
              Lọc nâng cao
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  Mã ID
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 min-w-[300px]">
                  Bài báo
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 text-center">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 text-center">
                  Hạn chót
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>
                    Đang tải...
                  </td>
                </tr>
              ) : computed.current.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                computed.current.map((a) => {
                  const s = (a.status || "").toLowerCase();
                  const isBlocked = s === "coi" || s === "declined";
                  const isDone = s === "completed";
                  const isAccepted = s === "accepted";

                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isBlocked ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className={`px-6 py-4 text-sm font-mono font-bold ${isBlocked ? "text-slate-400" : "text-primary"}`}>
                        #{a.id}
                      </td>

                      <td className={`px-6 py-4 ${isBlocked ? "opacity-70" : ""}`}>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 line-clamp-2">
                            Paper #{a.paper_id}
                          </span>
                          <span className="text-xs text-slate-400 mt-1 italic">
                            (Chưa có API title/track)
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">{statusBadge(a.status)}</td>

                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-medium ${isBlocked ? "text-slate-400 line-through" : "text-slate-600"}`}>
                          {a.due_date ? new Date(a.due_date).toLocaleDateString("vi-VN") : "—"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isBlocked ? (
                          <span className="text-xs text-red-600 font-semibold italic">
                            {s === "coi" ? "COI" : "Declined"}
                          </span>
                        ) : isDone ? (
                          <button
                            onClick={() => navigate(`/reviewer/assignments/${a.id}`)}
                            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                          >
                            Xem lại
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/reviewer/review/${a.id}`)}
                            className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:shadow-lg hover:shadow-primary/20 transition-all"
                            disabled={!isAccepted}
                            title={!isAccepted ? "Assignment cần Accepted" : ""}
                          >
                            Bắt đầu chấm điểm
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (dummy UI giống mẫu) */}
        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Hiển thị <span className="font-bold">1-{Math.min(10, computed.current.length)}</span> trên tổng{" "}
            <span className="font-bold">{computed.current.length}</span>
          </p>
          <div className="flex gap-2">
            <button className="size-8 rounded border border-slate-200 flex items-center justify-center text-slate-400 cursor-not-allowed">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="size-8 rounded bg-primary text-white flex items-center justify-center text-xs font-bold">
              1
            </button>
            <button className="size-8 rounded border border-slate-200 hover:bg-white flex items-center justify-center text-slate-600">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guidance Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4">
        <span className="material-symbols-outlined text-amber-600">info</span>
        <div>
          <p className="text-sm font-bold text-amber-900 leading-tight">
            Hướng dẫn chấm điểm
          </p>
          <p className="text-xs text-amber-800 mt-1">
            Reviewer vui lòng hoàn thành bản chấm điểm theo đúng tiêu chí. Các bài báo bị chặn (COI)
            sẽ không thể chấm.
          </p>
        </div>
      </div>
    </div>
  );
}
