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

      // Sau khi thêm xong: quay lại PaperDetail
      navigate(`/author/submissions/${paperId}`, { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Thêm đồng tác giả thất bại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-slate-50/50 min-h-[calc(100vh-64px)]">
      {/* Top bar (tone đỏ nhạt để khớp các trang khác) */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="text-rose-600">
            <span className="material-symbols-outlined text-2xl">person_add</span>
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">Thêm đồng tác giả</h2>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto w-full">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Thêm thông tin đồng tác giả</h1>
          <p className="text-slate-500">
            Vui lòng nhập thông tin chi tiết của đồng tác giả bên dưới để thêm vào bài báo của bạn.
          </p>
          {paper?.title && (
            <p className="mt-2 text-sm text-slate-400">
              Bài báo: <span className="font-semibold text-slate-700">{paper.title}</span>
            </p>
          )}
        </div>

        {err && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl font-semibold">
            {err}
          </div>
        )}

        {/* Form card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <form onSubmit={onSubmit} className="p-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">
                  Họ và tên <span className="text-rose-600">*</span>
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full rounded-lg border-slate-200 bg-white px-4 py-3 text-sm focus:border-rose-500 focus:ring-rose-500"
                  placeholder="Nhập họ và tên đầy đủ"
                  type="text"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">
                  Địa chỉ Email <span className="text-rose-600">*</span>
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border-slate-200 bg-white px-4 py-3 text-sm focus:border-rose-500 focus:ring-rose-500"
                  placeholder="vi-du@uth.edu.vn"
                  type="email"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">
                Đơn vị công tác <span className="text-rose-600">*</span>
              </label>
              <input
                value={form.organization}
                onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                className="w-full rounded-lg border-slate-200 bg-white px-4 py-3 text-sm focus:border-rose-500 focus:ring-rose-500"
                placeholder="Ví dụ: Khoa CNTT, Trường ĐH GTVT TP.HCM"
                type="text"
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center h-5">
                <input
                  checked={form.is_corresponding}
                  onChange={(e) => setForm((p) => ({ ...p, is_corresponding: e.target.checked }))}
                  className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  id="corresponding"
                  type="checkbox"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-sm font-black text-slate-900 cursor-pointer select-none"
                  htmlFor="corresponding"
                >
                  Tác giả liên hệ (Corresponding Author)
                </label>
                <p className="text-xs text-slate-500">
                  Đánh dấu nếu đây là người chịu trách nhiệm trao đổi chính về bài báo này.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl">
              <span className="material-symbols-outlined text-rose-600 shrink-0">info</span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-black text-rose-700">Thông báo quan trọng</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Hệ thống chỉ gửi email xác nhận nộp bài và các cập nhật trạng thái phê duyệt cho{" "}
                  <b>Tác giả liên hệ</b>. Vui lòng đảm bảo thông tin liên hệ là chính xác.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={busy}
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={busy}
                className="px-8 py-2.5 text-sm font-black text-white bg-rose-500 hover:bg-rose-600 rounded-lg shadow-sm shadow-rose-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                Lưu thông tin
              </button>
            </div>
          </form>
        </div>

        {/* Current authors list */}
        <div className="mt-10">
          <h3 className="text-base font-black mb-4 text-slate-800">
            Danh sách tác giả hiện tại ({authors.length})
          </h3>

          {loading ? (
            <div className="text-slate-500">Đang tải...</div>
          ) : authors.length === 0 ? (
            <div className="text-slate-500">Chưa có tác giả.</div>
          ) : (
            <div className="space-y-3">
              {authors.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-4 bg-white border border-dashed border-slate-200 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-600">
                      {initials(a.full_name)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{a.full_name}</p>
                      <p className="text-xs text-slate-500 italic">
                        {a.is_corresponding ? "Tác giả liên hệ (Corresponding)" : a.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">
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
