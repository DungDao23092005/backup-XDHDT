import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import reviewApi from "../../api/reviewApi";
import { useAuth } from "../../context/AuthContext";

function formatTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// Thêm props: paperId (ưu tiên), compact (chế độ thu gọn)
export default function ReviewDiscussion({ paperId: propPaperId, compact = false }) {
  // Lấy params từ URL nếu không có props
  const { paperId: paramPaperId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Logic ưu tiên: Props > URL Params
  const paperId = propPaperId || paramPaperId;

  const bottomRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [content, setContent] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);

  const meId = user?.id;

  const load = async () => {
    if (!paperId || Number.isNaN(Number(paperId))) {
      // Chỉ báo lỗi nếu không phải đang loading lần đầu (để tránh flash lỗi)
      if(!loading) setErr("Mã bài báo (Paper ID) không hợp lệ.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr("");
    try {
      const res = await reviewApi.listDiscussionsByPaper(Number(paperId));
      const list = Array.isArray(res) ? res : (res?.data || []);
      setItems(list);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (typeof detail === "object") {
        setErr(JSON.stringify(detail));
      } else {
        setErr(detail || e?.message || "Không tải được thảo luận");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paperId) {
        load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId]);

  useEffect(() => {
    if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [items, loading]);

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
    return arr;
  }, [items]);

  const send = async () => {
    const text = content.trim();
    if (!text) return;

    setSending(true);
    setErr("");
    try {
      await reviewApi.createDiscussion({
        paper_id: Number(paperId),
        sender_id: meId,
        content: text,
        parent_id: null,
      });
      setContent("");
      await load(); 
    } catch (e) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === "object" ? JSON.stringify(detail) : (detail || e?.message || "Gửi thất bại");
      setErr(msg);
    } finally {
      setSending(false);
    }
  };

  // --- RENDERING ---

  // 1. Wrapper Class: Nếu compact thì full height cha, nếu Page thì min-screen
  const containerClass = compact 
    ? "h-full flex flex-col bg-white" 
    : "min-h-screen bg-slate-50";
    
  // 2. Inner Content Class
  const innerClass = compact
    ? "flex flex-col flex-1 overflow-hidden" // Compact: Lấp đầy
    : "max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 h-[calc(100vh-64px)] flex flex-col"; // Page: Có padding, fixed height

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        
        {/* Header: Chỉ hiện khi KHÔNG PHẢI compact mode */}
        {!compact && (
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4 shrink-0">
            <div>
                <h1 className="text-2xl font-black text-slate-900">
                Thảo luận nội bộ • Paper #{paperId}
                </h1>
                <p className="text-sm text-slate-500">
                Trao đổi giữa các reviewer / chair (nếu có).
                </p>
            </div>

            <div className="flex items-center gap-2">
                <button
                onClick={() => navigate(-1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50"
                >
                Quay lại
                </button>
                <button
                onClick={load}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50 inline-flex items-center gap-2"
                title="Tải lại"
                >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    refresh
                </span>
                Tải lại
                </button>
            </div>
            </div>
        )}

        {/* Error */}
        {err ? (
          <div className="mb-4 bg-white border border-rose-200 rounded-2xl p-4 shrink-0">
            <p className="text-sm font-bold text-rose-600 break-words">{err}</p>
          </div>
        ) : null}

        {/* Main Chat Area */}
        <div className={`bg-white ${compact ? "" : "border border-slate-200 rounded-2xl shadow-sm"} flex flex-col flex-1 overflow-hidden`}>
          
          {/* Title bar trong box chat (Chỉ hiện nếu không compact hoặc tùy design) */}
          {!compact && (
            <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0 bg-white z-10">
                <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    forum
                </span>
                Luồng thảo luận
                </p>
                <span className="text-xs font-bold text-slate-500">
                Tổng: {items.length}
                </span>
            </div>
          )}

          {/* List Messages */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50/50">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <p className="text-sm text-slate-500 animate-pulse">Đang tải...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex justify-center items-center h-full flex-col gap-2">
                 <span className="material-symbols-outlined text-slate-300 text-4xl">chat_bubble_outline</span>
                 <p className="text-sm text-slate-400 italic">Chưa có tin nhắn nào.</p>
              </div>
            ) : (
              sorted.map((m) => {
                const isMe = meId != null && String(m.sender_id) === String(meId);
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div 
                        className={`rounded-2xl p-3 max-w-[90%] sm:max-w-[85%] border text-sm shadow-sm ${
                        isMe
                            ? "bg-blue-50 border-blue-100 text-slate-800 rounded-br-none"
                            : "bg-white border-slate-200 text-slate-800 rounded-bl-none"
                        }`}
                    >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {isMe ? "Bạn" : `Reviewer #${m.sender_id}`}
                        </span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] text-slate-400">
                            {formatTime(m.sent_at)}
                        </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 p-3 bg-white shrink-0">
            <div className="flex gap-2">
                <input
                value={content}
                disabled={sending}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                placeholder={compact ? "Nhập thảo luận..." : "Nhập nội dung thảo luận..."}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                    }
                }}
                />
                <button
                disabled={sending || !content.trim()}
                onClick={send}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                <span className="material-symbols-outlined text-lg">send</span>
                </button>
            </div>
            {!compact && (
                <div className="mt-2 text-[10px] text-slate-400 text-center sm:text-left">
                    * Lưu ý: Thảo luận này là nội bộ giữa các Reviewer và Chair.
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}