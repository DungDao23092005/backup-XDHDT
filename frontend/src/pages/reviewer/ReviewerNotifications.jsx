// src/pages/reviewer/ReviewerNotifications.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import notificationApi from "../../api/notificationApi";
import reviewDiscussionApi from "../../api/reviewDiscussionApi";
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

function categoryMetaFromSubject(subject) {
  const s = String(subject || "").toLowerCase();
  if (s.includes("phản biện") || s.includes("review"))
    return { label: "Ban thư ký", rgb: "34 197 94" }; // green
  if (s.includes("nhắc") || s.includes("deadline"))
    return { label: "Nhắc nhở", rgb: "245 158 11" }; // amber
  return { label: "Hệ thống", rgb: "244 63 94" }; // rose
}

// Chỉ bật box trao đổi khi notification thuộc nhóm review/rebuttal
function shouldShowDiscussion(subject) {
  const s = String(subject || "").toLowerCase();
  return (
    s.includes("phản biện") ||
    s.includes("review") ||
    s.includes("rebuttal") ||
    s.includes("yêu cầu chỉnh sửa") ||
    s.includes("revision") ||
    s.includes("trao đổi")
  );
}

export default function ReviewerNotifications() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  const [tab, setTab] = useState("all"); // all | unread
  const [selectedId, setSelectedId] = useState(null);

  // ✅ inbox responsive
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState("list"); // list | detail

  // ===== Discussions state =====
  const [discLoading, setDiscLoading] = useState(false);
  const [discErr, setDiscErr] = useState("");
  const [discItems, setDiscItems] = useState([]);
  const [discInput, setDiscInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, preview }
  const bottomRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setMobileView("list");
    };
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      const res = await notificationApi.getMyInbox();
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : [];

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

  const unreadCount = useMemo(() => items.filter((n) => !getIsRead(n)).length, [items]);

  const filtered = useMemo(() => {
    if (tab === "unread") return items.filter((n) => !getIsRead(n));
    return items;
  }, [items, tab]);

  const selected = useMemo(
    () => items.find((n) => String(n.id) === String(selectedId)) || null,
    [items, selectedId]
  );

  const paperId = selected?.paper_id ?? null;
  const showDiscussion = useMemo(
    () => !!paperId && shouldShowDiscussion(selected?.subject),
    [paperId, selected?.subject]
  );

  const onSelect = async (n) => {
    setSelectedId(n.id);
    if (isMobile) setMobileView("detail");

    // optimistic update UI
    if (!getIsRead(n)) {
      setItems((prev) => prev.map((x) => (String(x.id) === String(n.id) ? { ...x, is_read: true } : x)));

      try {
        await notificationApi.markRead(n.id);
      } catch (e) {
        setItems((prev) => prev.map((x) => (String(x.id) === String(n.id) ? { ...x, is_read: false } : x)));
        setErr(e?.response?.data?.detail || "Đánh dấu đã đọc thất bại.");
      }
    }
  };

  const markAllRead = async () => {
    const unreadIds = items.filter((x) => !getIsRead(x)).map((x) => x.id);
    if (unreadIds.length === 0) return;

    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));

    try {
      await Promise.all(unreadIds.map((id) => notificationApi.markRead(id)));
    } catch (e) {
      setErr("Có lỗi khi đánh dấu đã đọc tất cả. Đang tải lại...");
      await load();
    }
  };

  const SoftIconCircle = ({ icon }) => (
    <div
      className="size-12 rounded-full flex items-center justify-center border"
      style={{
        background: "rgb(var(--primary-rgb) / 0.10)",
        borderColor: "rgb(var(--primary-rgb) / 0.25)",
        color: "var(--primary)",
      }}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </div>
  );

  // ====== Load discussions when selected/paper changes ======
  const loadDiscussions = async (pid) => {
    if (!pid) return;
    try {
      setDiscLoading(true);
      setDiscErr("");
      const res = await reviewDiscussionApi.listByPaperId(pid);
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : [];
      // sort theo sent_at tăng dần
      list.sort((a, b) => new Date(a?.sent_at || 0).getTime() - new Date(b?.sent_at || 0).getTime());
      setDiscItems(list);
      setReplyTo(null);
    } catch (e) {
      setDiscErr(e?.response?.data?.detail || "Không tải được trao đổi.");
      setDiscItems([]);
    } finally {
      setDiscLoading(false);
    }
  };

  useEffect(() => {
    if (showDiscussion) loadDiscussions(paperId);
    else {
      setDiscItems([]);
      setDiscErr("");
      setDiscInput("");
      setReplyTo(null);
    }
    // eslint-disable-next-line
  }, [paperId, showDiscussion]);

  useEffect(() => {
    if (!showDiscussion) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [discItems, showDiscussion]);

  const onSendDiscussion = async () => {
    if (!paperId) return;
    const content = String(discInput || "").trim();
    if (!content) return;

    try {
      setSending(true);
      setDiscErr("");

      // Optimistic add for REVIEWER role
      const optimistic = {
        id: `tmp-${Date.now()}`,
        paper_id: paperId,
        sender_id: null,
        content,
        sent_at: new Date().toISOString(),
        parent_id: replyTo?.id ?? null,
        sender_role: "REVIEWER", // <--- KHÁC VỚI AUTHOR
        sender_name: "Tôi (Reviewer)",
        is_me: true,
      };
      setDiscItems((prev) => [...prev, optimistic]);
      setDiscInput("");
      setReplyTo(null);

      const res = await reviewDiscussionApi.create(paperId, content, optimistic.parent_id);
      const saved = res?.data ?? res;

      setDiscItems((prev) =>
        prev.map((x) => (String(x.id) === String(optimistic.id) ? saved : x))
      );
    } catch (e) {
      setDiscErr(e?.response?.data?.detail || "Gửi phản hồi thất bại.");
      setDiscItems((prev) => prev.filter((x) => !String(x.id).startsWith("tmp-")));
    } finally {
      setSending(false);
    }
  };

  const onReply = (msg) => {
    setReplyTo({
      id: msg?.id,
      preview: (msg?.content || "").slice(0, 120),
    });
    setTimeout(() => {
      const el = document.getElementById("discussion-input");
      el?.focus?.();
    }, 0);
  };

  // ========= UI blocks =========
  const LeftList = (
    <div
      className="w-full md:w-[420px] border-r flex flex-col"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="p-4 border-b space-y-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black" style={{ color: "var(--text)" }}>
            Danh sách
          </h2>
          <button onClick={markAllRead} className="text-xs font-black hover:underline" style={{ color: "var(--primary)" }}>
            Đánh dấu đã đọc tất cả
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("all")}
            className="px-3 py-1.5 text-xs rounded-full font-black transition"
            style={
              tab === "all"
                ? {
                    background: "rgb(var(--primary-rgb) / 0.12)",
                    border: "1px solid rgb(var(--primary-rgb) / 0.22)",
                    color: "var(--primary)",
                  }
                : {
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                  }
            }
          >
            Tất cả
          </button>

          <button
            onClick={() => setTab("unread")}
            className="px-3 py-1.5 text-xs rounded-full font-black transition"
            style={
              tab === "unread"
                ? {
                    background: "rgb(var(--primary-rgb) / 0.12)",
                    border: "1px solid rgb(var(--primary-rgb) / 0.22)",
                    color: "var(--primary)",
                  }
                : {
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                  }
            }
          >
            Chưa đọc
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 font-semibold" style={{ color: "var(--muted)" }}>
            Đang tải...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6" style={{ color: "var(--muted)" }}>
            Không có thông báo.
          </div>
        ) : (
          filtered.map((n) => {
            const isSelected = String(n.id) === String(selectedId);
            const isRead = getIsRead(n);
            const meta = categoryMetaFromSubject(n?.subject);

            return (
              <div
                key={n.id}
                onClick={() => onSelect(n)}
                className="p-4 border-b cursor-pointer relative transition"
                style={{
                  borderColor: "var(--border)",
                  background: isSelected ? "rgb(var(--primary-rgb) / 0.08)" : "transparent",
                  boxShadow: isSelected ? "inset 3px 0 0 var(--primary)" : "none",
                }}
              >
                {!isRead && (
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 size-2 rounded-full"
                    style={{ background: "var(--primary)" }}
                  />
                )}
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-black uppercase" style={{ color: `rgb(${meta.rgb} / 0.95)` }}>
                    {meta.label}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                    {formatTime(n?.created_at)}
                  </span>
                </div>
                <h3 className="text-sm font-black mb-1 line-clamp-1" style={{ color: "var(--text)" }}>
                  {getTitle(n)}
                </h3>
                <p className="text-xs line-clamp-2" style={{ color: "var(--muted)" }}>
                  {getBody(n)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const RightDetail = (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {!selected ? (
        <div className="p-10" style={{ color: "var(--muted)" }}>
          Chọn một thông báo để xem chi tiết.
        </div>
      ) : (
        <>
          <div className="p-6 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex justify-between items-start gap-6">
              <div className="flex items-start gap-4">
                <SoftIconCircle icon="notifications_active" />
                <div>
                  <h2 className="text-xl font-black" style={{ color: "var(--text)" }}>
                    {getTitle(selected)}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                    Thời gian:{" "}
                    <span className="font-semibold" style={{ color: "var(--text)" }}>
                      {formatTime(selected?.created_at)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isMobile && (
                  <button
                    onClick={() => setMobileView("list")}
                    className="px-3 py-2 text-sm font-black rounded-lg transition"
                    style={{ color: "var(--text)", border: "1px solid var(--border)", background: "transparent" }}
                  >
                    ← Danh sách
                  </button>
                )}
                <button
                  onClick={load}
                  className="p-2 rounded-lg transition"
                  title="Tải lại"
                  style={{ color: "var(--muted)" }}
                >
                  <span className="material-symbols-outlined">refresh</span>
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {paperId && (
                <div
                  className="px-3 py-1 rounded-lg border flex items-center gap-2"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                >
                  <span className="material-symbols-outlined text-sm" style={{ color: "var(--muted)" }}>
                    article
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    Paper ID: <span style={{ color: "var(--text)" }}>#{paperId}</span>
                  </span>
                </div>
              )}
              {showDiscussion && (
                <div
                  className="px-3 py-1 rounded-lg border flex items-center gap-2"
                  style={{
                    background: "rgb(var(--primary-rgb) / 0.08)",
                    borderColor: "rgb(var(--primary-rgb) / 0.22)",
                  }}
                >
                  <span className="material-symbols-outlined text-sm" style={{ color: "var(--primary)" }}>
                    forum
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                    Có trao đổi
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div
              className="max-w-3xl mx-auto p-6 md:p-8 rounded-2xl border shadow-sm"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="whitespace-pre-line leading-relaxed" style={{ color: "var(--text)" }}>
                {getBody(selected) || "Không có nội dung."}
              </div>

              <div className="mt-8 pt-6 flex flex-wrap items-center gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                {/* Link của Reviewer: Đến danh sách bài chấm hoặc trang chấm nếu biết assignmentID (tạm thời về list) */}
                <button
                  onClick={() => navigate(`/reviewer/assignments`)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 font-black rounded-xl transition active:scale-[0.98]"
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                    boxShadow: "0 10px 25px rgb(var(--primary-rgb) / 0.20)",
                  }}
                >
                  <span className="material-symbols-outlined text-xl">assignment</span>
                  Xem bài được phân công
                </button>

                {showDiscussion && (
                  <button
                    onClick={() => loadDiscussions(paperId)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 font-black rounded-xl transition active:scale-[0.98]"
                    style={{
                      background: "rgb(var(--primary-rgb) / 0.10)",
                      border: "1px solid rgb(var(--primary-rgb) / 0.22)",
                      color: "var(--primary)",
                    }}
                  >
                    <span className="material-symbols-outlined text-xl">chat</span>
                    Xem trao đổi
                  </button>
                )}
              </div>
            </div>

            {/* ====== DISCUSSION THREAD (REVIEWER VIEW) ====== */}
            {showDiscussion && (
              <div className="max-w-3xl mx-auto mt-6">
                <div
                  className="rounded-2xl border shadow-sm overflow-hidden"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="size-10 rounded-xl flex items-center justify-center border"
                        style={{
                          background: "rgb(var(--primary-rgb) / 0.10)",
                          borderColor: "rgb(var(--primary-rgb) / 0.22)",
                          color: "var(--primary)",
                        }}
                      >
                        <span className="material-symbols-outlined">forum</span>
                      </div>
                      <div>
                        <div className="font-black" style={{ color: "var(--text)" }}>
                          Trao đổi với Tác giả (Ẩn danh)
                        </div>
                        <div className="text-xs" style={{ color: "var(--muted)" }}>
                          Reviewer ID của bạn sẽ được ẩn đối với tác giả.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => loadDiscussions(paperId)}
                      className="px-3 py-2 text-xs font-black rounded-lg border bg-transparent"
                      style={{ color: "var(--text)", borderColor: "var(--border)" }}
                    >
                      Tải lại
                    </button>
                  </div>

                  <div className="p-5 md:p-6">
                    {discErr && (
                      <div className="mb-4 p-4 rounded-2xl font-semibold border text-rose-600 bg-rose-50 border-rose-200">
                        {discErr}
                      </div>
                    )}

                    <div className="max-h-[420px] overflow-y-auto pr-1">
                      {discLoading ? (
                        <div className="py-10 text-center text-muted">Đang tải trao đổi...</div>
                      ) : discItems.length === 0 ? (
                        <div className="py-10 text-center text-muted">Chưa có trao đổi nào.</div>
                      ) : (
                        <div className="space-y-3">
                          {discItems.map((m) => {
                            const mine = !!m?.is_me;
                            // Phía Reviewer: is_me = Reviewer, còn lại là Author
                            const senderName = mine ? "Tôi (Reviewer)" : "Tác giả";
                            const time = formatTime(m?.sent_at);

                            return (
                              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                <div
                                  className="max-w-[85%] p-4 rounded-2xl border"
                                  style={{
                                    background: mine ? "rgb(var(--primary-rgb) / 0.10)" : "var(--surface-2)",
                                    borderColor: mine ? "rgb(var(--primary-rgb) / 0.25)" : "var(--border)",
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-3 mb-2">
                                    <span className="text-xs font-black uppercase" style={{ color: "var(--muted)" }}>
                                      {senderName}
                                    </span>
                                    <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                                      {time}
                                    </span>
                                  </div>
                                  <div className="text-sm whitespace-pre-line" style={{ color: "var(--text)" }}>
                                    {m?.content || ""}
                                  </div>
                                  <div className="mt-3 flex justify-end">
                                    <button
                                      onClick={() => onReply(m)}
                                      className="text-xs font-black hover:underline"
                                      style={{ color: "var(--primary)" }}
                                    >
                                      Trả lời
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={bottomRef} />
                        </div>
                      )}
                    </div>

                    {replyTo && (
                      <div className="mt-5 p-4 rounded-2xl border bg-primary/5 border-primary/20">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs font-black text-primary">Đang trả lời</div>
                            <div className="text-xs mt-1 text-muted">{replyTo.preview}</div>
                          </div>
                          <button onClick={() => setReplyTo(null)} className="text-muted">
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-5">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="text-xs font-black text-muted">Phản hồi lại tác giả</label>
                          <textarea
                            id="discussion-input"
                            value={discInput}
                            onChange={(e) => setDiscInput(e.target.value)}
                            rows={3}
                            placeholder="Nhập câu hỏi hoặc phản hồi..."
                            className="w-full mt-2 px-4 py-3 rounded-2xl border outline-none bg-surface text-text border-border focus:border-primary/40"
                          />
                        </div>
                        <button
                          onClick={onSendDiscussion}
                          disabled={sending || !discInput.trim() || !paperId}
                          className="px-6 py-3 font-black rounded-2xl bg-primary text-white disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                          {sending ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined">send</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 64px)", overflowX: "hidden" }}>
      <div
        className="h-16 border-b flex items-center justify-between px-6 sticky top-0 z-10"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            Reviewer Inbox
          </h2>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-black border"
          style={{
            background: "rgb(var(--primary-rgb) / 0.10)",
            borderColor: "rgb(var(--primary-rgb) / 0.25)",
            color: "var(--primary)",
          }}
        >
          Thông báo
        </span>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-8 pb-12">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black" style={{ color: "var(--text)" }}>
              Hộp thư Thông báo
            </h1>
            <p className="mt-1" style={{ color: "var(--muted)" }}>
              Các thông báo từ ban tổ chức và trao đổi với tác giả.
            </p>
          </div>
          <div className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
            Chưa đọc:{" "}
            <span className="font-black" style={{ color: "var(--primary)" }}>
              {unreadCount}
            </span>
          </div>
        </div>

        {err && (
          <div className="mb-6 p-4 rounded-2xl font-semibold border text-rose-600 bg-rose-50 border-rose-200">
            {err}
          </div>
        )}

        <div className="border rounded-2xl shadow-sm overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex h-[calc(100vh-64px-220px)] min-h-[520px]">
            <div className="hidden md:flex w-full">
              {LeftList}
              {RightDetail}
            </div>
            <div className="flex md:hidden w-full">{mobileView === "list" ? LeftList : RightDetail}</div>
          </div>
        </div>
      </div>
    </div>
  );
}