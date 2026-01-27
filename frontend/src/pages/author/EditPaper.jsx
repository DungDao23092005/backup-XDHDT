// src/pages/author/EditPaper.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import conferenceApi from "../../api/conferenceApi";
import {
  getSubmissionById,
  deleteSubmissionAuthor,
  uploadNewVersion,
  updatePaperDetails,
} from "../../api/submissionApi";

// ====== status meta (tone nhẹ, đồng bộ rose) ======
const STATUS_META = {
  SUBMITTED: { label: "Đã nộp (Submitted)", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  UNDER_REVIEW: { label: "Đang phản biện", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ACCEPTED: { label: "Đã chấp nhận", cls: "bg-green-50 text-green-700 border-green-200" },
  REJECTED: { label: "Từ chối", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  WITHDRAWN: { label: "Rút bài", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  REVISION_REQUIRED: { label: "Cần sửa", cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

const MAX_MB = 20;
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

function normalizeStatus(s) {
  return String(s || "").toUpperCase();
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

function fileOk(file) {
  if (!file) return "Vui lòng chọn file.";
  const mb = file.size / (1024 * 1024);
  if (mb > MAX_MB) return `File vượt quá ${MAX_MB}MB.`;
  return "";
}

// ====== build link file đúng ======
function toDownloadUrl(raw) {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  let p = String(raw).trim();
  if (!p.startsWith("/")) p = `/${p}`;

  // backend lưu dạng /papers/... => gateway thường expose /submission/uploads/papers/...
  if (p.startsWith("/papers/")) p = `/uploads${p}`;
  if (!p.startsWith("/submission/")) p = `/submission${p}`;

  return encodeURI(`${API_BASE}${p}`);
}

function normalizeKeywordsFromPaper(paper) {
  const k =
    paper?.keywords ||
    paper?.keyword_list ||
    paper?.paper_keywords ||
    paper?.meta?.keywords ||
    [];
  if (Array.isArray(k)) {
    return k
      .map((x) => (typeof x === "string" ? x : x?.name || x?.keyword || ""))
      .filter(Boolean);
  }
  if (typeof k === "string") {
    return k
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function pickVersions(paper) {
  const v =
    paper?.versions ||
    paper?.paper_versions ||
    paper?.version_history ||
    paper?.paper_versions_history ||
    [];
  return Array.isArray(v) ? v : [];
}

function pickAuthors(paper) {
  const a = paper?.authors || paper?.paper_authors || [];
  return Array.isArray(a) ? a : [];
}

export default function EditPaper() {
  const { id } = useParams();
  const paperId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [paper, setPaper] = useState(null);
  const [confName, setConfName] = useState("");

  // form state
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [kwInput, setKwInput] = useState("");

  const fileRef = useRef(null);

  const status = normalizeStatus(paper?.status);
  const statusMeta = STATUS_META[status] || {
    label: status || "UNKNOWN",
    cls: "bg-slate-50 text-slate-600 border-slate-200",
  };

  const authors = useMemo(() => pickAuthors(paper), [paper]);
  const versions = useMemo(() => pickVersions(paper), [paper]);

  const latestVersion = useMemo(() => {
    if (!versions.length) return null;
    return [...versions].sort((a, b) => (a.version_number || 0) - (b.version_number || 0)).at(-1);
  }, [versions]);

  const latestFileUrl = useMemo(() => {
    const raw = latestVersion?.file_url || latestVersion?.url || paper?.file_url;
    return toDownloadUrl(raw);
  }, [latestVersion, paper]);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      const p = await getSubmissionById(paperId);
      setPaper(p);

      setTitle(p?.title || "");
      setAbstract(p?.abstract || "");
      setKeywords(normalizeKeywordsFromPaper(p));

      if (p?.conference_id) {
        try {
          const conf = await conferenceApi.getConferenceById(p.conference_id);
          setConfName(conf?.name || "");
        } catch {
          setConfName("");
        }
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || "Không tải được dữ liệu bài báo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(paperId) || paperId <= 0) {
      setErr("paperId không hợp lệ.");
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId]);

  const onAddKeyword = (raw) => {
    const v = String(raw || "").trim();
    if (!v) return;
    setKeywords((prev) => {
      const set = new Set(prev.map((x) => x.toLowerCase()));
      if (set.has(v.toLowerCase())) return prev;
      return [...prev, v];
    });
  };

  const onKeyDownKeyword = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddKeyword(kwInput);
      setKwInput("");
    }
    if (e.key === "Backspace" && !kwInput && keywords.length) {
      setKeywords((prev) => prev.slice(0, -1));
    }
  };

  const removeKeyword = (k) => setKeywords((prev) => prev.filter((x) => x !== k));

  const onUploadNewVersion = async (file) => {
    const msg = fileOk(file);
    if (msg) return setErr(msg);

    try {
      setBusy(true);
      setErr("");
      await uploadNewVersion({ paperId, file });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Tải phiên bản mới thất bại.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDeleteAuthor = async (authorId) => {
    if (!window.confirm("Xoá tác giả này?")) return;
    try {
      setBusy(true);
      setErr("");
      await deleteSubmissionAuthor(paperId, authorId);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Xoá tác giả thất bại.");
    } finally {
      setBusy(false);
    }
  };

const DRAFT_KEY = `paper_draft_${paperId}`;

const onSaveDraft = () => {
  try {
    setErr("");
    const payload = { title, abstract, keywords, savedAt: new Date().toISOString() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    alert("Đã lưu nháp.");
  } catch {
    setErr("Lưu nháp thất bại.");
  }
};

const onSaveChanges = async (e) => {
  e.preventDefault();

  if (!title.trim()) {
    setErr("Tiêu đề không được để trống.");
    return;
  }

  try {
    setBusy(true);
    setErr("");

    await updatePaperDetails(paperId, {
      title: title.trim(),
      abstract: abstract || "",
      keywords,
    });

    localStorage.removeItem(DRAFT_KEY);

    navigate(`/author/submissions/${paperId}`, { replace: true });
  } catch (e2) {
    setErr(e2?.response?.data?.detail || "Lưu thay đổi thất bại.");
  } finally {
    setBusy(false);
  }
};

  if (loading) return <div className="p-8 text-slate-500">Đang tải...</div>;

  if (!paper) {
    return (
      <div className="bg-slate-50/50 min-h-[calc(100vh-64px)]">
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl font-semibold">
            {err || "Không tìm thấy bài báo."}
          </div>
          <button
            onClick={() => navigate("/author/submissions")}
            className="mt-4 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/50 min-h-[calc(100vh-64px)]">
      {/* ✅ Top bar KHỚP PaperDetail */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
        <button
          onClick={() => navigate(`/author/submissions`)}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-bold"
        >
          <span className="material-symbols-outlined text-slate-400">arrow_back</span>
          Quay lại chi tiết
        </button>

        <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold border border-rose-200">
          Chỉnh sửa bài nộp
        </span>
      </div>

      {/* ✅ Content padding KHỚP PaperDetail */}
      <div className="max-w-5xl mx-auto p-6 md:p-8 pb-12">
        {/* heading */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">
              Chỉnh sửa bài báo #{String(paper.id).padStart(4, "0")}
            </h1>
            <p className="text-slate-500 mt-1">Cập nhật thông tin chi tiết và phiên bản mới cho bài báo của bạn.</p>
            <p className="text-xs text-slate-400 mt-2">
              Hội nghị:{" "}
              <span className="font-semibold text-slate-600">
                {confName || `Conference #${paper.conference_id ?? "--"}`}
              </span>
            </p>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Trạng thái hiện tại</span>
            <span
              className={[
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-black border",
                statusMeta.cls,
              ].join(" ")}
            >
              <span className="size-2 rounded-full bg-current mr-2 opacity-60" />
              {statusMeta.label}
            </span>
          </div>
        </div>

        {err && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl font-semibold">
            {err}
          </div>
        )}

        <form onSubmit={onSaveChanges} className="space-y-6">
          {/* ===== Basic info ===== */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
              <span className="material-symbols-outlined text-rose-600">edit_note</span>
              <h3 className="text-lg font-black text-slate-900">Thông tin cơ bản</h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Tiêu đề bài báo</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-none"
                  placeholder="Nhập tiêu đề..."
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Tóm tắt (Abstract)</label>
                <textarea
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm min-h-[160px] resize-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-none"
                  placeholder="Nhập tóm tắt..."
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Từ khóa (Keywords)</label>

                <div className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-rose-500/30 focus-within:border-rose-500">
                  {keywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-100"
                    >
                      {k}
                      <button
                        type="button"
                        onClick={() => removeKeyword(k)}
                        className="material-symbols-outlined text-sm hover:text-rose-900"
                        title="Xóa"
                      >
                        close
                      </button>
                    </span>
                  ))}

                  <input
                    value={kwInput}
                    onChange={(e) => setKwInput(e.target.value)}
                    onKeyDown={onKeyDownKeyword}
                    className="flex-1 min-w-[140px] bg-transparent border-none p-1 text-sm focus:ring-0 outline-none"
                    placeholder="Thêm từ khóa mới..."
                  />
                </div>

                <p className="text-xs text-slate-400 mt-2 italic">Gợi ý: Nhấn Enter để thêm từ khóa.</p>
              </div>
            </div>
          </section>

          {/* ===== Authors ===== */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600">groups</span>
                <h3 className="text-lg font-black text-slate-900">Danh sách Tác giả</h3>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/author/submissions/${paperId}/authors/new`)}
                className="text-sm font-black text-rose-600 hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                Thêm đồng tác giả
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 font-black border-b border-slate-100">
                    <th className="pb-3 px-2">Họ và tên</th>
                    <th className="pb-3 px-2">Email</th>
                    <th className="pb-3 px-2">Đơn vị công tác</th>
                    <th className="pb-3 px-2 text-center">Vai trò</th>
                    <th className="pb-3 px-2 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {authors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 px-2 text-slate-500">
                        Chưa có tác giả.
                      </td>
                    </tr>
                  ) : (
                    authors.map((a) => {
                      const isMain = !!a.is_corresponding;
                      return (
                        <tr key={a.id}>
                          <td className="py-4 px-2 font-black text-slate-900">{a.full_name}</td>
                          <td className="py-4 px-2 text-slate-600">{a.email}</td>
                          <td className="py-4 px-2 text-slate-600">{a.organization || "--"}</td>
                          <td className="py-4 px-2 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black uppercase">
                              {isMain ? "Liên hệ" : "Đồng tác giả"}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/author/submissions/${paperId}/authors/${a.id}/edit?from=edit`)
                                }
                                className="text-amber-600 hover:bg-amber-50 p-2 rounded-lg"
                                title="Chỉnh sửa"
                              >
                                <span className="material-symbols-outlined">edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onDeleteAuthor(a.id)}
                                className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg"
                                title="Xóa"
                              >
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ===== Document ===== */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
              <span className="material-symbols-outlined text-rose-600">upload_file</span>
              <h3 className="text-lg font-black text-slate-900">Tài liệu bài báo</h3>
            </div>

            <div className="bg-rose-50/40 rounded-2xl p-6 border-2 border-dashed border-rose-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="size-14 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900">
                      {latestVersion?.file_name ||
                        latestVersion?.filename ||
                        latestVersion?.original_filename ||
                        "paper.pdf"}
                    </h4>

                    <p className="text-sm text-slate-500 mt-1">
                      Phiên bản:{" "}
                      <span className="font-semibold text-slate-700">v{latestVersion?.version_number ?? "--"}</span> •
                      Ngày tải lên:{" "}
                      <span className="font-semibold text-slate-700">
                        {formatDate(latestVersion?.created_at || paper?.updated_at || paper?.created_at)}
                      </span>
                    </p>

                    <div className="flex items-center gap-4 mt-3">
                      {latestFileUrl ? (
                        <a
                          href={latestFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-black text-rose-600 flex items-center gap-1 hover:underline"
                        >
                          <span className="material-symbols-outlined text-base">download</span>
                          Tải xuống bản này
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Chưa có file_url</span>
                      )}

                      {latestFileUrl ? (
                        <a
                          href={latestFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-black text-slate-600 flex items-center gap-1 hover:underline"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                          Xem trước
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => onUploadNewVersion(e.target.files?.[0])}
                  />

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-rose-400 text-rose-600 font-black rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">cloud_upload</span>
                    Tải lên phiên bản mới
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4 px-1">
              <strong>Lưu ý:</strong> Định dạng hỗ trợ: PDF. Dung lượng tối đa 20MB.
            </p>
          </section>

          {/* actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 pb-2">
            <button
              type="button"
              onClick={() => navigate(`/author/submissions`)}
              className="w-full sm:w-auto px-8 py-3 text-slate-600 font-black hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Hủy bỏ và Quay lại
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                disabled={busy}
                onClick={onSaveDraft}
                className="w-full sm:w-auto px-8 py-3 border border-slate-300 text-slate-700 font-black rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Lưu nháp
              </button>

              <button
                type="submit"
                disabled={busy}
                className="w-full sm:w-auto px-10 py-3 bg-rose-500 text-white font-black rounded-xl hover:bg-rose-600 transition-shadow shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">save</span>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}