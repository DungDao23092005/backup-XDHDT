// src/pages/author/EditSubmissionAuthor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getSubmissionById, updateSubmissionAuthor } from "../../api/submissionApi";

export default function EditSubmissionAuthor() {
  const { id, authorId } = useParams();
  const paperId = Number(id);
  const aId = Number(authorId);

  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const from = sp.get("from") || "detail";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [paper, setPaper] = useState(null);

  const author = useMemo(() => {
    const list = paper?.authors || paper?.paper_authors || [];
    return Array.isArray(list) ? list.find((x) => Number(x.id) === aId) : null;
  }, [paper, aId]);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    organization: "",
    is_corresponding: false,
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const p = await getSubmissionById(paperId);
        setPaper(p);
      } catch (e) {
        setErr(e?.response?.data?.detail || "Không tải được dữ liệu bài báo.");
      } finally {
        setLoading(false);
      }
    })();
  }, [paperId]);

  useEffect(() => {
    if (!author) return;
    setForm({
      full_name: author.full_name || "",
      email: author.email || "",
      organization: author.organization || "",
      is_corresponding: !!author.is_corresponding,
    });
  }, [author]);

  const goBack = () => {
    if (from === "edit") return navigate(`/author/submissions/${paperId}/edit`);
    return navigate(`/author/submissions/${paperId}`);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const fn = form.full_name.trim();
    const em = form.email.trim();
    if (!fn || !em) return setErr("Vui lòng nhập Họ tên và Email.");

    try {
      setBusy(true);
      setErr("");
      await updateSubmissionAuthor(paperId, aId, {
        full_name: fn,
        email: em,
        organization: form.organization?.trim() || "",
        is_corresponding: !!form.is_corresponding,
      });
      goBack();
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Cập nhật tác giả thất bại.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-8 font-semibold" style={{ color: "var(--muted)" }}>Đang tải...</div>;

  if (!author) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 64px)" }}>
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          <div
            className="p-4 rounded-2xl font-semibold border"
            style={{
              background: "rgb(244 63 94 / 0.12)",
              borderColor: "rgb(244 63 94 / 0.25)",
              color: "rgb(244 63 94 / 0.95)",
            }}
          >
            Không tìm thấy tác giả cần sửa.
          </div>
          <button
            onClick={goBack}
            className="mt-4 px-4 py-2 rounded-lg font-bold transition"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 64px)" }}>
      {/* top bar */}
      <div
        className="h-16 border-b flex items-center justify-between px-6 sticky top-0 z-10"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <button
          onClick={goBack}
          className="flex items-center gap-2 font-bold transition rounded-lg px-2 py-2"
          style={{ color: "var(--text)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span className="material-symbols-outlined" style={{ color: "var(--muted)" }}>
            arrow_back
          </span>
          Quay lại
        </button>

        <span
          className="px-3 py-1 rounded-full text-xs font-black border"
          style={{
            background: "rgb(var(--primary-rgb) / 0.10)",
            borderColor: "rgb(var(--primary-rgb) / 0.25)",
            color: "var(--primary)",
          }}
        >
          Chỉnh sửa đồng tác giả
        </span>
      </div>

      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
        {err && (
          <div
            className="p-4 rounded-2xl font-semibold border"
            style={{
              background: "rgb(244 63 94 / 0.12)",
              borderColor: "rgb(244 63 94 / 0.25)",
              color: "rgb(244 63 94 / 0.95)",
            }}
          >
            {err}
          </div>
        )}

        <div>
          <h1 className="text-2xl md:text-3xl font-black" style={{ color: "var(--text)" }}>
            Chỉnh sửa thông tin đồng tác giả
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)" }}>
            Cập nhật thông tin tác giả cho bài báo #{String(paperId).padStart(4, "0")}.
          </p>
        </div>

        <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <form onSubmit={onSubmit} className="p-6 md:p-8 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black mb-2" style={{ color: "var(--text)" }}>
                  Họ và tên <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full h-11 rounded-lg px-4 text-sm outline-none"
                  placeholder="Nhập họ và tên đầy đủ"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgb(var(--primary-rgb) / 0.55)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-2" style={{ color: "var(--text)" }}>
                  Email <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full h-11 rounded-lg px-4 text-sm outline-none"
                  placeholder="vi-du@uth.edu.vn"
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

            <div>
              <label className="block text-sm font-black mb-2" style={{ color: "var(--text)" }}>
                Đơn vị công tác
              </label>
              <input
                value={form.organization}
                onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                className="w-full h-11 rounded-lg px-4 text-sm outline-none"
                placeholder="Ví dụ: Khoa CNTT, Trường ĐH..."
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
              <input
                type="checkbox"
                checked={form.is_corresponding}
                onChange={(e) => setForm((p) => ({ ...p, is_corresponding: e.target.checked }))}
                className="w-5 h-5 mt-0.5"
                style={{ accentColor: "var(--primary)" }}
              />
              <div>
                <p className="font-black" style={{ color: "var(--text)" }}>
                  Tác giả liên hệ (Corresponding)
                </p>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Hệ thống ưu tiên gửi thông báo cho tác giả liên hệ.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={goBack}
                className="px-5 h-11 rounded-lg font-bold transition"
                style={{ border: "1px solid var(--border)", color: "var(--text)", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Hủy
              </button>

              <button
                disabled={busy}
                type="submit"
                className="px-6 h-11 rounded-lg font-black transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  boxShadow: "0 10px 25px rgb(var(--primary-rgb) / 0.20)",
                }}
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
