import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listMySubmissions } from "../../api/submissionApi";
import conferenceApi from "../../api/conferenceApi";

// Tabs
const TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "UNDER_REVIEW", label: "Đang đợi duyệt" },
  { key: "ACCEPTED", label: "Đã chấp nhận" },
  { key: "REJECTED_WITHDRAWN", label: "Từ chối/Rút bài" },
];

// status -> label + tone color (RGBA style compatible dark)
const STATUS_META = {
  SUBMITTED: { label: "Submitted", tone: "blue" },
  UNDER_REVIEW: { label: "Under review", tone: "amber" },
  ACCEPTED: { label: "Accepted", tone: "green" },
  REJECTED: { label: "Rejected", tone: "rose" },
  WITHDRAWN: { label: "Withdrawn", tone: "slate" },
  REVISION_REQUIRED: { label: "Revision required", tone: "violet" },
};

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

/** helper: tailwind cannot compute rgb() well, so do inline style */
function toneStyle(tone) {
  // base RGB by tone
  const map = {
    blue: "59 130 246", // blue-500
    amber: "245 158 11", // amber-500
    green: "34 197 94", // green-500
    rose: "244 63 94", // rose-500
    violet: "139 92 246", // violet-500
    slate: "100 116 139", // slate-500
  };
  const rgb = map[tone] || map.slate;
  return {
    borderColor: `rgb(${rgb} / 0.25)`,
    backgroundColor: `rgb(${rgb} / 0.12)`,
    color: `rgb(${rgb} / 0.95)`,
  };
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

  // search expand
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
        const results = await Promise.allSettled(
          ids.map((id) => conferenceApi.getConferenceById(id))
        );

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

  const primaryBtnStyle = {
    background: "var(--primary)",
    color: "#fff",
    boxShadow: "0 10px 25px rgb(var(--primary-rgb) / 0.20)",
  };

  return (
    <div
      className="min-h-[calc(100vh-64px)] overflow-x-hidden"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Header bar */}
      <div
        className="h-16 flex items-center justify-between px-6 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black" style={{ color: "var(--text)" }}>
            Bài nộp của tôi
          </h2>
        </div>

        <button
          onClick={() => navigate("/author/submissions/new")}
          className="h-10 px-4 rounded-lg font-black transition active:scale-[0.98]"
          style={primaryBtnStyle}
        >
          + Nộp bài mới
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12 space-y-5">
        {/* Title */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black" style={{ color: "var(--text)" }}>
            Bài nộp của tôi
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Quản lý và theo dõi tiến độ các bài báo nghiên cứu của bạn.
          </p>
        </div>

        {/* Tabs + Search */}
        <div
          className="rounded-2xl border shadow-sm overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b"
               style={{ borderColor: "var(--border)" }}
          >
            {/* Tabs */}
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
                    className="px-6 py-4 text-sm whitespace-nowrap border-b-2 transition font-black"
                    style={{
                      borderBottomColor: active ? "var(--primary)" : "transparent",
                      color: active ? "var(--primary)" : "var(--muted)",
                      background: active ? "rgb(var(--primary-rgb) / 0.08)" : "transparent",
                    }}
                  >
                    {t.label}{" "}
                    <span style={{ color: active ? "rgb(var(--primary-rgb) / 0.80)" : "var(--muted)" }}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + Filter */}
            <div className="p-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                {!searchOpen ? (
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="h-10 w-10 rounded-lg border flex items-center justify-center transition"
                    style={{
                      background: "var(--surface-2)",
                      borderColor: "var(--border)",
                      color: "var(--muted)",
                    }}
                    title="Tìm kiếm"
                  >
                    <span className="material-symbols-outlined">search</span>
                  </button>
                ) : (
                  <div className="relative">
                    <span
                      className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                      style={{ color: "var(--muted)" }}
                    >
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
                      className="h-10 rounded-lg border pl-10 pr-3 text-sm outline-none"
                      style={{
                        width: 320,
                        background: "var(--surface-2)",
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                className="h-10 w-10 rounded-lg border transition flex items-center justify-center"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                }}
                title="Bộ lọc"
                onClick={() => {}}
              >
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="min-w-full w-full text-left border-collapse">
              <thead
                className="text-xs font-black uppercase"
                style={{ background: "var(--surface-2)", color: "var(--muted)" }}
              >
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Tiêu đề bài báo</th>
                  <th className="px-6 py-4">Hội nghị</th>
                  <th className="px-6 py-4">Ngày nộp</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Hành động</th>
                </tr>
              </thead>

              <tbody style={{ borderTop: `1px solid var(--border)` }}>
                {loading ? (
                  <tr>
                    <td className="px-6 py-10 font-semibold" style={{ color: "var(--muted)" }} colSpan={6}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : err ? (
                  <tr>
                    <td className="px-6 py-10 font-semibold" style={{ color: "rgb(244 63 94 / 0.95)" }} colSpan={6}>
                      {err}
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12" style={{ color: "var(--muted)" }} colSpan={6}>
                      Không có bài nộp phù hợp.
                    </td>
                  </tr>
                ) : (
                  paged.map((it) => {
                    const meta = STATUS_META[it.status] || { label: it.status, tone: "slate" };
                    return (
                      <tr
                        key={it.id}
                        className="transition"
                        style={{
                          borderTop: `1px solid var(--border)`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.04)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <td className="px-6 py-4 text-sm font-semibold" style={{ color: "var(--muted)" }}>
                          #{String(it.id).padStart(4, "0")}
                        </td>

                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-sm font-black line-clamp-2" style={{ color: "var(--text)" }}>
                            {it.title || "(Chưa có tiêu đề)"}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm" style={{ color: "var(--muted)" }}>
                          {confMap[it.conference_id] || `Conference #${it.conference_id}`}
                        </td>

                        <td className="px-6 py-4 text-sm" style={{ color: "var(--muted)" }}>
                          {formatDate(it.submitted_at || it.created_at)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-black"
                            style={toneStyle(meta.tone)}
                          >
                            <span
                              className="size-1.5 rounded-full mr-1.5"
                              style={{ backgroundColor: "currentColor", opacity: 0.6 }}
                            />
                            {meta.label}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => navigate(`/author/submissions/${it.id}`)}
                            className="p-2 rounded-lg transition"
                            title="Xem chi tiết"
                            style={{
                              color: "var(--primary)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.10)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>

                          <button
                            onClick={() => navigate(`/author/submissions/${it.id}/edit`)}
                            className="p-2 rounded-lg transition"
                            title="Chỉnh sửa bài báo"
                            style={{
                              color: "rgb(245 158 11 / 0.95)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgb(245 158 11 / 0.12)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
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
          <div
            className="px-6 py-4 border-t flex items-center justify-between"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
          >
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Đang hiển thị {paged.length ? (page - 1) * pageSize + 1 : 0}-
              {Math.min(page * pageSize, filtered.length)} trên tổng số {filtered.length} bài nộp
            </p>

            <div className="flex items-center gap-2">
              <button
                className="p-1.5 rounded border transition disabled:opacity-40"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  color: "var(--muted)",
                }}
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
                    className="w-8 h-8 flex items-center justify-center rounded text-sm font-black border transition"
                    style={
                      active
                        ? {
                            background: "var(--primary)",
                            color: "#fff",
                            borderColor: "var(--primary)",
                          }
                        : {
                            background: "var(--surface)",
                            color: "var(--text)",
                            borderColor: "var(--border)",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = "var(--surface)";
                    }}
                  >
                    {n}
                  </button>
                );
              })}

              <button
                className="p-1.5 rounded border transition disabled:opacity-40"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  color: "var(--muted)",
                }}
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Tổng số bài nộp" value={counts.ALL} icon="task" tone="primary" />
          <StatCard title="Được chấp nhận" value={counts.ACCEPTED} icon="verified" tone="green" />
          <StatCard title="Đang chờ xử lý" value={counts.UNDER_REVIEW} icon="update" tone="amber" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, tone = "primary" }) {
  const style =
    tone === "primary"
      ? {
          backgroundColor: "rgb(var(--primary-rgb) / 0.12)",
          borderColor: "rgb(var(--primary-rgb) / 0.25)",
          color: "var(--primary)",
        }
      : toneStyle(tone);

  return (
    <div
      className="p-6 rounded-2xl border shadow-sm flex items-center gap-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="size-12 rounded-xl border flex items-center justify-center" style={style}>
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>

      <div>
        <p className="text-xs uppercase font-black tracking-tight" style={{ color: "var(--muted)" }}>
          {title}
        </p>
        <p className="text-2xl font-black" style={{ color: "var(--text)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}
