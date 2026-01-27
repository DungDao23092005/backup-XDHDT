// src/pages/author/Notifications.jsx
import React, { useEffect, useMemo, useState } from "react";
import notificationApi from "../../api/notificationApi";
import { useNavigate } from "react-router-dom";

/** ===== Helpers (khớp schema MessageResponse) ===== */
function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getTitle(n) {
  return n?.subject || "Thông báo";
}

function getBody(n) {
  return n?.body || "";
}

function getIsRead(n) {
  return !!n?.is_read;
}

/**
 * Bạn hiện chưa có field category/type trong MessageResponse,
 * nên tạm phân loại dựa theo subject (có thể chỉnh theo ý bạn)
 */
function categoryMetaFromSubject(subject) {
  const s = String(subject || "").toLowerCase();
  if (s.includes("phản biện") || s.includes("review"))
    return { label: "Ban thư ký", cls: "text-green-600" };
  if (s.includes("nhắc") || s.includes("deadline"))
    return { label: "Nhắc nhở", cls: "text-orange-500" };
  return { label: "Hệ thống", cls: "text-rose-600" };
}

export default function Notifications() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  const [tab, setTab] = useState("all"); // all | unread
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      const res = await notificationApi.getMyInbox();

      // axiosClient thường trả res.data -> nếu axiosClient của bạn đã unwrap thì giữ nguyên
      const data = res?.data ?? res;

      const list = Array.isArray(data) ? data : [];

      // sort mới nhất lên trước
      list.sort((a, b) => {
        const ta = new Date(a?.created_at || 0).getTime();
        const tb = new Date(b?.created_at || 0).getTime();
        return tb - ta;
      });

      setItems(list);
      if (!selectedId && list[0]?.id) setSelectedId(list[0].id);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Không tải được thông báo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const unreadCount = useMemo(
    () => items.filter((n) => !getIsRead(n)).length,
    [items]
  );

  const filtered = useMemo(() => {
    if (tab === "unread") return items.filter((n) => !getIsRead(n));
    return items;
  }, [items, tab]);

  const selected = useMemo(
    () => items.find((n) => String(n.id) === String(selectedId)) || null,
    [items, selectedId]
  );

  const onSelect = async (n) => {
    setSelectedId(n.id);

    // optimistic update UI
    if (!getIsRead(n)) {
      setItems((prev) =>
        prev.map((x) =>
          String(x.id) === String(n.id) ? { ...x, is_read: true } : x
        )
      );

      try {
        await notificationApi.markRead(n.id);
      } catch (e) {
        // rollback nếu fail
        setItems((prev) =>
          prev.map((x) =>
            String(x.id) === String(n.id) ? { ...x, is_read: false } : x
          )
        );
        setErr(e?.response?.data?.detail || "Đánh dấu đã đọc thất bại.");
      }
    }
  };

  const markAllRead = async () => {
    const unreadIds = items.filter((x) => !getIsRead(x)).map((x) => x.id);
    if (unreadIds.length === 0) return;

    // optimistic
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));

    try {
      await Promise.all(unreadIds.map((id) => notificationApi.markRead(id)));
    } catch (e) {
      setErr("Có lỗi khi đánh dấu đã đọc tất cả. Đang tải lại...");
      await load();
    }
  };

  const paperId = selected?.paper_id ?? null;

  return (
    <div className="bg-slate-50/50 min-h-[calc(100vh-64px)] overflow-x-hidden">
      {/* ✅ Top bar đồng bộ giống PaperDetail, bỏ breadcrumb */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">Hộp thư thông báo</h2>
        </div>

        <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold border border-rose-200">
          Thông báo
        </span>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto p-6 md:p-8 pb-12">
        {/* Title row (giống nhịp spacing PaperDetail) */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">
              Hộp thư Thông báo
            </h1>
            <p className="text-slate-500 mt-1">Xem và quản lý các thông báo hệ thống của bạn.</p>
          </div>

          <div className="text-sm text-slate-600 font-semibold">
            Chưa đọc:{" "}
            <span className="font-black text-rose-600">{unreadCount}</span>
          </div>
        </div>

        {err && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl font-semibold">
            {err}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex h-[calc(100vh-64px-220px)] min-h-[520px]">
            {/* Left list */}
            <div className="w-full md:w-[420px] border-r border-slate-200 bg-white flex flex-col">
              <div className="p-4 border-b border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900">Danh sách</h2>
                  <button
                    onClick={markAllRead}
                    className="text-rose-600 text-xs font-black hover:underline"
                  >
                    Đánh dấu đã đọc tất cả
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTab("all")}
                    className={[
                      "px-3 py-1.5 text-xs rounded-full",
                      tab === "all"
                        ? "bg-rose-500/10 text-rose-600 font-black"
                        : "text-slate-500 hover:bg-slate-100 font-semibold",
                    ].join(" ")}
                  >
                    Tất cả
                  </button>

                  <button
                    onClick={() => setTab("unread")}
                    className={[
                      "px-3 py-1.5 text-xs rounded-full",
                      tab === "unread"
                        ? "bg-rose-500/10 text-rose-600 font-black"
                        : "text-slate-500 hover:bg-slate-100 font-semibold",
                    ].join(" ")}
                  >
                    Chưa đọc
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-slate-500 font-semibold">Đang tải...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-6 text-slate-500">Không có thông báo.</div>
                ) : (
                  filtered.map((n) => {
                    const isSelected = String(n.id) === String(selectedId);
                    const isRead = getIsRead(n);
                    const meta = categoryMetaFromSubject(n?.subject);

                    return (
                      <div
                        key={n.id}
                        onClick={() => onSelect(n)}
                        className={[
                          "p-4 border-b border-slate-100 cursor-pointer relative",
                          isSelected
                            ? "bg-rose-50/50 border-l-4 border-l-rose-500"
                            : "hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {!isRead && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 size-2 bg-rose-500 rounded-full" />
                        )}

                        <div className="flex justify-between items-start mb-1">
                          <span className={["text-xs font-black uppercase", meta.cls].join(" ")}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatTime(n?.created_at)}
                          </span>
                        </div>

                        <h3 className="text-sm font-black text-slate-900 mb-1 line-clamp-1">
                          {getTitle(n)}
                        </h3>

                        <p className="text-xs text-slate-500 line-clamp-2">
                          {getBody(n)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right detail */}
            <div className="flex-1 bg-slate-50/50 flex flex-col overflow-hidden">
              {!selected ? (
                <div className="p-10 text-slate-500">Chọn một thông báo để xem chi tiết.</div>
              ) : (
                <>
                  <div className="p-6 bg-white border-b border-slate-200">
                    <div className="flex justify-between items-start gap-6">
                      <div className="flex items-start gap-4">
                        <div className="size-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600">
                          <span className="material-symbols-outlined text-2xl">mail</span>
                        </div>

                        <div>
                          <h2 className="text-xl font-black text-slate-900">
                            {getTitle(selected)}
                          </h2>
                          <p className="text-sm text-slate-500 mt-1">
                            Thời gian:{" "}
                            <span className="font-semibold text-slate-700">
                              {formatTime(selected?.created_at)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={load}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                        title="Tải lại"
                      >
                        <span className="material-symbols-outlined">refresh</span>
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {paperId && (
                        <div className="px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-slate-400">
                            article
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            Paper ID: <span className="text-slate-900">#{paperId}</span>
                          </span>
                        </div>
                      )}

                      <div className="px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-slate-400">
                          mark_email_read
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          Trạng thái:{" "}
                          <span className="text-slate-900">
                            {getIsRead(selected) ? "Đã đọc" : "Chưa đọc"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-slate-700 whitespace-pre-line leading-relaxed">
                        {getBody(selected) || "Không có nội dung."}
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => paperId && navigate(`/author/submissions/${paperId}`)}
                          disabled={!paperId}
                          className={[
                            "inline-flex items-center gap-2 px-6 py-2.5 font-black rounded-xl",
                            paperId
                              ? "bg-rose-500 text-white hover:bg-rose-600"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed",
                          ].join(" ")}
                        >
                          <span className="material-symbols-outlined text-xl">visibility</span>
                          Xem chi tiết bài báo
                        </button>
                      </div>
                    </div>

                    <div className="max-w-3xl mx-auto mt-4 text-center">
                      <p className="text-xs text-slate-400">
                        Đây là thông báo hệ thống. Vui lòng không trả lời trực tiếp.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
