import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listMySubmissions } from "../../api/submissionApi";
import conferenceApi from "../../api/conferenceApi";

// Map status -> label + style
const STATUS_META = {
  SUBMITTED: { label: "Submitted", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  UNDER_REVIEW: { label: "Under review", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ACCEPTED: { label: "Accepted", cls: "bg-green-50 text-green-700 border-green-200" },
  REJECTED: { label: "Rejected", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  WITHDRAWN: { label: "Withdrawn", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  REVISION_REQUIRED: { label: "Revision required", cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

const TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "UNDER_REVIEW", label: "Đang đợi duyệt" },
  { key: "ACCEPTED", label: "Đã chấp nhận" },
  { key: "REJECTED_WITHDRAWN", label: "Từ chối/Rút bài" },
];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function formatDate(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function MySubmissions() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [confMap, setConfMap] = useState({});

  const [tab, setTab] = useState("ALL");
  const [q, setQ] = useState("");

  // pagination (client-side)
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // ===== search expand (click mới dài ra) =====
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const data = await listMySubmissions();
        const list = normalizeList(data);
        setItems(list);

        const ids = [...new Set(list.map((x) => x.conference_id).filter(Boolean))];
        const results = await Promise.allSettled(ids.map((id) => conferenceApi.getConferenceById(id)));

        const nextMap = {};
        results.forEach((r, idx) => {
          const id = ids[idx];
          if (r.status === "fulfilled" && r.value?.name) nextMap[id] = r.value.name;
        });
        setConfMap(nextMap);
      } catch (e) {
        setErr(e?.response?.data?.detail || "Không tải được danh sách bài nộp.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = useMemo(() => {
    const c = { ALL: items.length, UNDER_REVIEW: 0, ACCEPTED: 0, REJECTED_WITHDRAWN: 0 };
    for (const it of items) {
      if (it.status === "UNDER_REVIEW" || it.status === "SUBMITTED") c.UNDER_REVIEW += 1;
      if (it.status === "ACCEPTED") c.ACCEPTED += 1;
      if (it.status === "REJECTED" || it.status === "WITHDRAWN") c.REJECTED_WITHDRAWN += 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let arr = items;

    if (tab === "UNDER_REVIEW") {
      arr = arr.filter((x) => x.status === "UNDER_REVIEW" || x.status === "SUBMITTED");
    } else if (tab === "ACCEPTED") {
      arr = arr.filter((x) => x.status === "ACCEPTED");
    } else if (tab === "REJECTED_WITHDRAWN") {
      arr = arr.filter((x) => x.status === "REJECTED" || x.status === "WITHDRAWN");
    }

    if (qq) {
      arr = arr.filter((x) => {
        const title = (x.title || "").toLowerCase();
        const conf = String(x.conference_id ?? "").toLowerCase();
        const track = String(x.track_id ?? "").toLowerCase();
        return title.includes(qq) || conf.includes(qq) || track.includes(qq);
      });
    }
    return arr;
  }, [items, tab, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => {
    const p = Math.min(page, pageCount);
    const start = (p - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageCount]);

  useEffect(() => setPage(1), [tab, q]);

  const visiblePages = useMemo(() => {
    const maxBtns = 5;
    const safePage = Math.min(page, pageCount);
    let start = Math.max(1, safePage - Math.floor(maxBtns / 2));
    let end = Math.min(pageCount, start + maxBtns - 1);
    start = Math.max(1, end - maxBtns + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, pageCount]);

  return (
    <div className="bg-slate-50/50 min-h-[calc(100vh-64px)] overflow-x-hidden">
      {/* Header bar (đồng bộ SubmitPaper) */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">Bài nộp của tôi</h2>
        </div>

        <button
          onClick={() => navigate("/author/submissions/new")}
          className="h-10 px-4 rounded-lg bg-rose-500 text-white font-bold hover:opacity-95 shadow-sm"
        >
          + Nộp bài mới
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12 space-y-5">
        {/* Title + subtitle (tone/typography đồng bộ SubmitPaper) */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Bài nộp của tôi</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý và theo dõi tiến độ các bài báo nghiên cứu của bạn.</p>
        </div>

        {/* Tabs + Search (card style rose) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200">
            {/* Tabs underline (rose) */}
            <div className="flex overflow-x-auto">
              {TABS.map((t) => {
                const active = tab === t.key;
                const count =
                  t.key === "ALL"
                    ? counts.ALL
                    : t.key === "UNDER_REVIEW"
                    ? counts.UNDER_REVIEW
                    : t.key === "ACCEPTED"
                    ? counts.ACCEPTED
                    : counts.REJECTED_WITHDRAWN;

                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={[
                      "px-6 py-4 text-sm whitespace-nowrap border-b-2 transition-colors font-bold",
                      active
                        ? "border-rose-500 text-rose-600 bg-rose-50/40"
                        : "border-transparent text-slate-500 hover:text-slate-900",
                    ].join(" ")}
                  >
                    {t.label}{" "}
                    <span className={active ? "text-rose-600/80" : "text-slate-400"}>({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Search (click mới dài ra) + Filter */}
            <div className="p-3 flex items-center gap-3">
              {/* Collapsible search */}
              <div className="flex items-center gap-2">
                {!searchOpen ? (
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="h-10 w-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
                    title="Tìm kiếm"
                  >
                    <span className="material-symbols-outlined text-slate-500">search</span>
                  </button>
                ) : (
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                      search
                    </span>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Tìm kiếm theo tiêu đề..."
                      autoFocus
                      onBlur={() => {
                        if (!q.trim()) setSearchOpen(false);
                      }}
                      className="h-10 w-[220px] md:w-[280px] lg:w-[320px] rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm focus:border-rose-500 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                className="h-10 w-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                title="Bộ lọc"
                onClick={() => {}}
              >
                <span className="material-symbols-outlined text-slate-500">filter_list</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="min-w-full w-full text-left border-collapse">
              <thead className="bg-slate-50 text-xs font-black text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Tiêu đề bài báo</th>
                  <th className="px-6 py-4">Hội nghị</th>
                  <th className="px-6 py-4">Ngày nộp</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Hành động</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td className="px-6 py-10 text-slate-500 font-semibold" colSpan={6}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : err ? (
                  <tr>
                    <td className="px-6 py-10 text-rose-600 font-semibold" colSpan={6}>
                      {err}
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-slate-500" colSpan={6}>
                      Không có bài nộp phù hợp.
                    </td>
                  </tr>
                ) : (
                  paged.map((it) => {
                    const meta =
                      STATUS_META[it.status] || {
                        label: it.status,
                        cls: "bg-slate-50 text-slate-600 border-slate-200",
                      };

                    return (
                      <tr key={it.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-500">
                          #{String(it.id).padStart(4, "0")}
                        </td>

                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-sm font-black text-slate-900 line-clamp-2">
                            {it.title || "(Chưa có tiêu đề)"}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {confMap[it.conference_id] || `Conference #${it.conference_id}`}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(it.submitted_at || it.created_at)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={[
                              "inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-black",
                              meta.cls,
                            ].join(" ")}
                          >
                            <span className="size-1.5 rounded-full bg-current mr-1.5 opacity-60" />
                            {meta.label}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => navigate(`/author/submissions/${it.id}`)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Xem chi tiết"
                          >
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>

                          <button
                            onClick={() => navigate(`/author/submissions/${it.id}/edit`)}
                            className="p-2 text-amber-600 hover:bg-amber-600/10 rounded-lg"
                            title="Chỉnh sửa bài báo"
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Đang hiển thị {paged.length ? (page - 1) * pageSize + 1 : 0}-
              {Math.min(page * pageSize, filtered.length)} trên tổng số {filtered.length} bài nộp
            </p>

            <div className="flex items-center gap-2">
              <button
                className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-white disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>

              {visiblePages.map((n) => {
                const active = n === page;
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={[
                      "w-8 h-8 flex items-center justify-center rounded text-sm font-black border",
                      active
                        ? "bg-rose-500 text-white border-rose-500"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    {n}
                  </button>
                );
              })}

              <button
                className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-white disabled:opacity-40"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats cards (rose đồng bộ) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Tổng số bài nộp" value={counts.ALL} icon="task" tone="rose" />
          <StatCard title="Được chấp nhận" value={counts.ACCEPTED} icon="verified" tone="green" />
          <StatCard title="Đang chờ xử lý" value={counts.UNDER_REVIEW} icon="update" tone="amber" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, tone = "rose" }) {
  const toneMap = {
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    green: "bg-green-50 text-green-600 border-green-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={["size-12 rounded-xl border flex items-center justify-center", toneMap[tone]].join(" ")}>
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>

      <div>
        <p className="text-xs text-slate-500 uppercase font-black tracking-tight">{title}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}