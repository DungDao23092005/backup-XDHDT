// src/pages/author/AddCoAuthor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addSubmissionAuthor, getSubmissionById } from "../../api/submissionApi";

function formatDate(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "??";
  const parts = s.split(/\s+/);
  const a = [];
  if (parts[0]) a.push(parts[0][0]);
  if (parts.length > 1) a.push(parts[parts.length - 1][0]);
  return a.join("").toUpperCase();
}

export default function AddCoAuthor() {
  const { id } = useParams(); // /author/submissions/:id/authors/new
  const paperId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [paper, setPaper] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    organization: "",
    is_corresponding: false,
  });

  const authors = useMemo(() => {
    const a = paper?.authors || paper?.paper_authors || [];
    return Array.isArray(a) ? a : [];
  }, [paper]);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const p = await getSubmissionById(paperId);
      setPaper(p);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Không tải được thông tin bài báo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(paperId)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId]);

  const onCancel = () => navigate(`/author/submissions/${paperId}`);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    const full_name = form.full_name.trim();
    const email = form.email.trim();
    const organization = form.organization.trim();

    if (!full_name || !email || !organization) {
      setErr("Vui lòng nhập đầy đủ Họ và tên, Email và Đơn vị công tác.");
      return;
    }

    try {
      setBusy(true);
      await addSubmissionAuthor(paperId, {
        full_name,
        email,
        organization,
        is_corresponding: !!form.is_corresponding,
      });
      navigate(`/author/submissions/${paperId}`, { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Thêm đồng tác giả thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const SoftBadge = ({ children }) => (
    <span
      className="px-3 py-1 rounded-full text-xs font-black border"
      style={{
        background: "rgb(var(--primary-rgb) / 0.10)",
        borderColor: "rgb(var(--primary-rgb) / 0.25)",
        color: "var(--primary)",
      }}
    >
      {children}
    </span>
  );

  return (
    <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 64px)" }}>
      {/* Top bar */}
      <div
        className="h-16 border-b flex items-center justify-between px-6 md:px-8 sticky top-0 z-10"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div style={{ color: "var(--primary)" }}>
            <span className="material-symbols-outlined text-2xl">person_add</span>
          </div>
          <h2 className="text-lg font-black tracking-tight" style={{ color: "var(--text)" }}>
            Thêm đồng tác giả
          </h2>
        </div>

        <SoftBadge>Co-author</SoftBadge>
      </div>

      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2" style={{ color: "var(--text)" }}>
            Thêm thông tin đồng tác giả
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Vui lòng nhập thông tin chi tiết của đồng tác giả bên dưới để thêm vào bài báo của bạn.
          </p>
          {paper?.title && (
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              Bài báo:{" "}
              <span className="font-semibold" style={{ color: "var(--text)" }}>
                {paper.title}
              </span>
            </p>
          )}
        </div>

        {err && (
          <div
            className="mb-6 p-4 rounded-xl font-semibold border"
            style={{
              background: "rgb(244 63 94 / 0.12)",
              borderColor: "rgb(244 63 94 / 0.25)",
              color: "rgb(244 63 94 / 0.95)",
            }}
          >
            {err}
          </div>
        )}

        {/* Form card */}
        <div className="rounded-2xl shadow-sm overflow-hidden border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <form onSubmit={onSubmit} className="p-6 md:p-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  Họ và tên <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                  placeholder="Nhập họ và tên đầy đủ"
                  type="text"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgb(var(--primary-rgb) / 0.55)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  Địa chỉ Email <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                  placeholder="vi-du@uth.edu.vn"
                  type="email"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgb(var(--primary-rgb) / 0.55)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold" style={{ color: "var(--text)" }}>
                Đơn vị công tác <span style={{ color: "var(--primary)" }}>*</span>
              </label>
              <input
                value={form.organization}
                onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                placeholder="Ví dụ: Khoa CNTT, Trường ĐH GTVT TP.HCM"
                type="text"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgb(var(--primary-rgb) / 0.55)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>

            <div
              className="flex items-start gap-3 p-4 rounded-xl border"
              style={{ background: "rgb(var(--primary-rgb) / 0.06)", borderColor: "rgb(var(--primary-rgb) / 0.18)" }}
            >
              <div className="flex items-center h-5">
                <input
                  checked={form.is_corresponding}
                  onChange={(e) => setForm((p) => ({ ...p, is_corresponding: e.target.checked }))}
                  className="w-5 h-5 rounded"
                  id="corresponding"
                  type="checkbox"
                  style={{ accentColor: "var(--primary)" }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-black cursor-pointer select-none" style={{ color: "var(--text)" }} htmlFor="corresponding">
                  Tác giả liên hệ (Corresponding Author)
                </label>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Đánh dấu nếu đây là người chịu trách nhiệm trao đổi chính về bài báo này.
                </p>
              </div>
            </div>

            <div
              className="flex gap-4 p-4 rounded-r-xl border-l-4"
              style={{
                background: "rgb(var(--primary-rgb) / 0.08)",
                borderLeftColor: "var(--primary)",
                borderTop: "1px solid rgb(var(--primary-rgb) / 0.18)",
                borderRight: "1px solid rgb(var(--primary-rgb) / 0.18)",
                borderBottom: "1px solid rgb(var(--primary-rgb) / 0.18)",
              }}
            >
              <span className="material-symbols-outlined shrink-0" style={{ color: "var(--primary)" }}>
                info
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-black" style={{ color: "var(--primary)" }}>
                  Thông báo quan trọng
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                  Hệ thống chỉ gửi email xác nhận nộp bài và các cập nhật trạng thái phê duyệt cho{" "}
                  <b>Tác giả liên hệ</b>. Vui lòng đảm bảo thông tin liên hệ là chính xác.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="px-6 py-2.5 text-sm font-bold rounded-lg transition"
                style={{ color: "var(--text)", border: "1px solid var(--border)", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={busy}
                className="px-8 py-2.5 text-sm font-black rounded-lg transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  boxShadow: "0 10px 25px rgb(var(--primary-rgb) / 0.20)",
                }}
              >
                <span className="material-symbols-outlined text-sm">save</span>
                Lưu thông tin
              </button>
            </div>
          </form>
        </div>

        {/* Current authors list */}
        <div className="mt-10">
          <h3 className="text-base font-black mb-4" style={{ color: "var(--text)" }}>
            Danh sách tác giả hiện tại ({authors.length})
          </h3>

          {loading ? (
            <div style={{ color: "var(--muted)" }}>Đang tải...</div>
          ) : authors.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>Chưa có tác giả.</div>
          ) : (
            <div className="space-y-3">
              {authors.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-dashed"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="size-9 rounded-full flex items-center justify-center font-black text-xs"
                      style={{
                        background: "rgb(var(--primary-rgb) / 0.10)",
                        border: "1px solid rgb(var(--primary-rgb) / 0.20)",
                        color: "var(--primary)",
                      }}
                    >
                      {initials(a.full_name)}
                    </div>
                    <div>
                      <p className="text-sm font-black" style={{ color: "var(--text)" }}>
                        {a.full_name}
                      </p>
                      <p className="text-xs italic" style={{ color: "var(--muted)" }}>
                        {a.is_corresponding ? "Tác giả liên hệ (Corresponding)" : a.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {a.created_at ? formatDate(a.created_at) : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
