import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import reviewApi from "../../api/reviewApi";
import { useAuth } from "../../context/AuthContext";

function formatTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

export default function ReviewDiscussion() {
  const { paperId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [content, setContent] = useState("");
  const [err, setErr] = useState("");

  const meId = user?.id;

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await reviewApi.listDiscussionsByPaper(Number(paperId));
      setItems(res?.data ?? []);
    } catch (e) {
      setErr(
        e?.response?.data?.detail || e?.message || "Không tải được thảo luận"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId]);

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
    return arr;
  }, [items]);

  const send = async () => {
    const text = content.trim();
    if (!text) return;
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
      setErr(e?.response?.data?.detail || e?.message || "Gửi thất bại");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
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

        {/* Error */}
        {err ? (
          <div className="mb-4 bg-white border border-rose-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-rose-600">{err}</p>
          </div>
        ) : null}

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
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

          <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto bg-slate-50/50">
            {loading ? (
              <p className="text-sm text-slate-500">Đang tải...</p>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có tin nhắn.</p>
            ) : (
              sorted.map((m) => {
                const isMe = meId != null && String(m.sender_id) === String(meId);
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl p-4 border ${
                      isMe
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-900">
                        {isMe ? "Bạn" : `Reviewer #${m.sender_id}`}
                      </p>
                      <p className="text-xs text-slate-500">{formatTime(m.sent_at)}</p>
                    </div>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                      {m.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-200 p-4 flex gap-3 bg-white">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Nhập nội dung..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              onClick={send}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700"
            >
              Gửi
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          * Lưu ý: đây là thảo luận nội bộ, không hiển thị cho tác giả.
        </div>
      </div>
    </div>
  );
}
