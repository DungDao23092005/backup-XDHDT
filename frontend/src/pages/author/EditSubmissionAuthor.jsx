import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getSubmissionById, updateSubmissionAuthor } from "../../api/submissionApi";

export default function EditSubmissionAuthor() {
  const { id, authorId } = useParams(); // id = paperId
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

  if (loading) return <div className="p-8 text-slate-500 font-semibold">Đang tải...</div>;

  if (!author) {
    return (
      <div className="bg-slate-50/50 min-h-[calc(100vh-64px)]">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl font-semibold">
            Không tìm thấy tác giả cần sửa.
          </div>
          <button
            onClick={goBack}
            className="mt-4 px-4 py-2 rounded-lg border border-slate-300 font-bold hover:bg-slate-50"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/50 min-h-[calc(100vh-64px)]">
      {/* top bar */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
        <button onClick={goBack} className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-bold">
          <span className="material-symbols-outlined text-slate-400">arrow_back</span>
          Quay lại
        </button>

        <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold border border-rose-200">
          Chỉnh sửa đồng tác giả
        </span>
      </div>

      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
        {err && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl font-semibold">{err}</div>
        )}

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Chỉnh sửa thông tin đồng tác giả</h1>
          <p className="text-slate-500 mt-1">Cập nhật thông tin tác giả cho bài báo #{String(paperId).padStart(4, "0")}.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <form onSubmit={onSubmit} className="p-6 md:p-8 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full h-11 rounded-lg border border-slate-200 px-4 text-sm focus:border-rose-500 focus:ring-rose-500"
                  placeholder="Nhập họ và tên đầy đủ"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full h-11 rounded-lg border border-slate-200 px-4 text-sm focus:border-rose-500 focus:ring-rose-500"
                  placeholder="vi-du@uth.edu.vn"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">Đơn vị công tác</label>
              <input
                value={form.organization}
                onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                className="w-full h-11 rounded-lg border border-slate-200 px-4 text-sm focus:border-rose-500 focus:ring-rose-500"
                placeholder="Ví dụ: Khoa CNTT, Trường ĐH..."
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-rose-50/40 rounded-xl border border-rose-100">
              <input
                type="checkbox"
                checked={form.is_corresponding}
                onChange={(e) => setForm((p) => ({ ...p, is_corresponding: e.target.checked }))}
                className="w-5 h-5 text-rose-600 focus:ring-rose-500 mt-0.5"
              />
              <div>
                <p className="font-black text-slate-900">Tác giả liên hệ (Corresponding)</p>
                <p className="text-sm text-slate-600">
                  Hệ thống ưu tiên gửi thông báo cho tác giả liên hệ.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={goBack}
                className="px-5 h-11 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>

              <button
                disabled={busy}
                type="submit"
                className="px-6 h-11 rounded-lg bg-rose-500 text-white font-black hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2"
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
