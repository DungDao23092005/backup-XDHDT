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

// ====== status meta (tokenized) ======
const STATUS_META = {
  SUBMITTED: { label: "Đã nộp (Submitted)", tone: "info" },
  UNDER_REVIEW: { label: "Đang phản biện", tone: "warn" },
  ACCEPTED: { label: "Đã chấp nhận", tone: "success" },
  REJECTED: { label: "Từ chối", tone: "danger" },
  WITHDRAWN: { label: "Rút bài", tone: "neutral" },
  REVISION_REQUIRED: { label: "Cần sửa", tone: "purple" },
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

function fileOkPdf(file) {
  if (!file) return "Vui lòng chọn file.";
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Chỉ chấp nhận file PDF.";
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

// ====== small UI helpers ======
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

function StatusPill({ tone, label }) {
  // tone palette (không hard-code trắng/sáng)
  const toneStyle =
    tone === "info"
      ? { bg: "rgb(59 130 246 / 0.12)", bd: "rgb(59 130 246 / 0.25)", fg: "rgb(59 130 246 / 0.95)" }
      : tone === "warn"
      ? { bg: "rgb(245 158 11 / 0.12)", bd: "rgb(245 158 11 / 0.25)", fg: "rgb(245 158 11 / 0.95)" }
      : tone === "success"
      ? { bg: "rgb(34 197 94 / 0.12)", bd: "rgb(34 197 94 / 0.25)", fg: "rgb(34 197 94 / 0.95)" }
      : tone === "danger"
      ? { bg: "rgb(244 63 94 / 0.12)", bd: "rgb(244 63 94 / 0.25)", fg: "rgb(244 63 94 / 0.95)" }
      : tone === "purple"
      ? { bg: "rgb(168 85 247 / 0.12)", bd: "rgb(168 85 247 / 0.25)", fg: "rgb(168 85 247 / 0.95)" }
      : { bg: "rgb(148 163 184 / 0.14)", bd: "rgb(148 163 184 / 0.26)", fg: "rgb(148 163 184 / 0.95)" };

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black border"
      style={{ background: toneStyle.bg, borderColor: toneStyle.bd, color: toneStyle.fg }}
    >
      <span className="size-2 rounded-full mr-2" style={{ background: toneStyle.fg, opacity: 0.65 }} />
      {label}
    </span>
  );
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
  const statusMeta = STATUS_META[status] || { label: status || "UNKNOWN", tone: "neutral" };

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

      // restore draft (nếu có)
      const DRAFT_KEY = `paper_draft_${paperId}`;
      const rawDraft = localStorage.getItem(DRAFT_KEY);
      if (rawDraft) {
        try {
          const d = JSON.parse(rawDraft);
          if (d?.title != null) setTitle(String(d.title));
          if (d?.abstract != null) setAbstract(String(d.abstract));
          if (Array.isArray(d?.keywords)) setKeywords(d.keywords);
        } catch {
          // ignore
        }
      }

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
    const msg = fileOkPdf(file);
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

  if (loading) return <div className="p-8 font-semibold" style={{ color: "var(--muted)" }}>Đang tải...</div>;

  if (!paper) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 64px)" }}>
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          <div
            className="p-4 rounded-2xl font-semibold border"
            style={{
              background: "rgb(244 63 94 / 0.12)",
              borderColor: "rgb(244 63 94 / 0.25)",
              color: "rgb(244 63 94 / 0.95)",
            }}
          >
            {err || "Không tìm thấy bài báo."}
          </div>

          <button
            onClick={() => navigate("/author/submissions")}
            className="mt-4 px-4 py-2 rounded-lg font-bold transition"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 64px)" }}>
      {/* Top bar */}
      <div
        className="h-16 border-b flex items-center justify-between px-6 sticky top-0 z-10"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => navigate(`/author/submissions/${paperId}`)}
          className="flex items-center gap-2 font-bold rounded-lg px-2 py-2 transition"
          style={{ color: "var(--text)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span className="material-symbols-outlined" style={{ color: "var(--muted)" }}>
            arrow_back
          </span>
          Quay lại chi tiết
        </button>

        <SoftBadge>Chỉnh sửa bài nộp</SoftBadge>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6 md:p-8 pb-12">
        {/* heading */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black" style={{ color: "var(--text)" }}>
              Chỉnh sửa bài báo #{String(paper.id).padStart(4, "0")}
            </h1>
            <p className="mt-1" style={{ color: "var(--muted)" }}>
              Cập nhật thông tin chi tiết và phiên bản mới cho bài báo của bạn.
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
              Hội nghị:{" "}
              <span className="font-semibold" style={{ color: "var(--text)" }}>
                {confName || `Conference #${paper.conference_id ?? "--"}`}
              </span>
            </p>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>
              Trạng thái hiện tại
            </span>
            <StatusPill tone={statusMeta.tone} label={statusMeta.label} />
          </div>
        </div>

        {err && (
          <div
            className="mb-6 p-4 rounded-2xl font-semibold border"
            style={{
              background: "rgb(244 63 94 / 0.12)",
              borderColor: "rgb(244 63 94 / 0.25)",
              color: "rgb(244 63 94 / 0.95)",
            }}
          >
            {err}
          </div>
        )}

        <form onSubmit={onSaveChanges} className="space-y-6">
          {/* ===== Basic info ===== */}
          <section className="rounded-2xl border shadow-sm p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 pb-4 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>
                edit_note
              </span>
              <h3 className="text-lg font-black" style={{ color: "var(--text)" }}>
                Thông tin cơ bản
              </h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-black mb-2" style={{ color: "var(--text)" }}>
                  Tiêu đề bài báo
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  placeholder="Nhập tiêu đề..."
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
                  Tóm tắt (Abstract)
                </label>
                <textarea
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm min-h-[160px] resize-none outline-none"
                  placeholder="Nhập tóm tắt..."
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
                  Từ khóa (Keywords)
                </label>

                <div
                  className="w-full px-3 py-2 rounded-xl text-sm flex flex-wrap gap-2 items-center"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {keywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border"
                      style={{
                        background: "rgb(var(--primary-rgb) / 0.10)",
                        borderColor: "rgb(var(--primary-rgb) / 0.22)",
                        color: "var(--primary)",
                      }}
                    >
                      {k}
                      <button
                        type="button"
                        onClick={() => removeKeyword(k)}
                        className="material-symbols-outlined text-sm"
                        style={{ color: "var(--primary)" }}
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
                    className="flex-1 min-w-[140px] bg-transparent border-none p-1 text-sm outline-none"
                    placeholder="Thêm từ khóa mới..."
                    style={{ color: "var(--text)" }}
                  />
                </div>

                <p className="text-xs mt-2 italic" style={{ color: "var(--muted)" }}>
                  Gợi ý: Nhấn Enter để thêm từ khóa.
                </p>
              </div>
            </div>
          </section>

          {/* ===== Authors ===== */}
          <section className="rounded-2xl border shadow-sm p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between pb-4 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>
                  groups
                </span>
                <h3 className="text-lg font-black" style={{ color: "var(--text)" }}>
                  Danh sách Tác giả
                </h3>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/author/submissions/${paperId}/authors/new`)}
                className="text-sm font-black hover:underline flex items-center gap-1"
                style={{ color: "var(--primary)" }}
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                Thêm đồng tác giả
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ color: "var(--muted)" }}>
                    <th className="pb-3 px-2 font-black">Họ và tên</th>
                    <th className="pb-3 px-2 font-black">Email</th>
                    <th className="pb-3 px-2 font-black">Đơn vị công tác</th>
                    <th className="pb-3 px-2 text-center font-black">Vai trò</th>
                    <th className="pb-3 px-2 text-right font-black">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {authors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 px-2" style={{ color: "var(--muted)" }}>
                        Chưa có tác giả.
                      </td>
                    </tr>
                  ) : (
                    authors.map((a) => {
                      const isMain = !!a.is_corresponding;
                      return (
                        <tr key={a.id}>
                          <td className="py-4 px-2 font-black" style={{ color: "var(--text)" }}>
                            {a.full_name}
                          </td>
                          <td className="py-4 px-2" style={{ color: "var(--muted)" }}>
                            {a.email}
                          </td>
                          <td className="py-4 px-2" style={{ color: "var(--muted)" }}>
                            {a.organization || "--"}
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-black uppercase border"
                              style={{
                                background: "rgb(var(--primary-rgb) / 0.08)",
                                borderColor: "rgb(var(--primary-rgb) / 0.20)",
                                color: "var(--primary)",
                              }}
                            >
                              {isMain ? "Liên hệ" : "Đồng tác giả"}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/author/submissions/${paperId}/authors/${a.id}/edit?from=edit`)}
                                className="p-2 rounded-lg transition disabled:opacity-50"
                                title="Chỉnh sửa"
                                style={{ color: "rgb(245 158 11 / 0.95)" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(245 158 11 / 0.10)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <span className="material-symbols-outlined">edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onDeleteAuthor(a.id)}
                                className="p-2 rounded-lg transition disabled:opacity-50"
                                title="Xóa"
                                style={{ color: "rgb(244 63 94 / 0.95)" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(244 63 94 / 0.10)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
          <section className="rounded-2xl border shadow-sm p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 pb-4 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>
                upload_file
              </span>
              <h3 className="text-lg font-black" style={{ color: "var(--text)" }}>
                Tài liệu bài báo
              </h3>
            </div>

            <div
              className="rounded-2xl p-6 border-2 border-dashed"
              style={{
                background: "rgb(var(--primary-rgb) / 0.06)",
                borderColor: "rgb(var(--primary-rgb) / 0.22)",
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div
                    className="size-14 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      background: "rgb(var(--primary-rgb) / 0.10)",
                      borderColor: "rgb(var(--primary-rgb) / 0.20)",
                      color: "var(--primary)",
                    }}
                  >
                    <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
                  </div>

                  <div>
                    <h4 className="font-black" style={{ color: "var(--text)" }}>
                      {latestVersion?.file_name ||
                        latestVersion?.filename ||
                        latestVersion?.original_filename ||
                        "paper.pdf"}
                    </h4>

                    <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                      Phiên bản:{" "}
                      <span className="font-semibold" style={{ color: "var(--text)" }}>
                        v{latestVersion?.version_number ?? "--"}
                      </span>{" "}
                      • Ngày tải lên:{" "}
                      <span className="font-semibold" style={{ color: "var(--text)" }}>
                        {formatDate(latestVersion?.created_at || paper?.updated_at || paper?.created_at)}
                      </span>
                    </p>

                    <div className="flex items-center gap-4 mt-3">
                      {latestFileUrl ? (
                        <a
                          href={latestFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-black flex items-center gap-1 hover:underline"
                          style={{ color: "var(--primary)" }}
                        >
                          <span className="material-symbols-outlined text-base">download</span>
                          Tải xuống bản này
                        </a>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--muted)" }}>
                          Chưa có file_url
                        </span>
                      )}

                      {latestFileUrl ? (
                        <a
                          href={latestFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-black flex items-center gap-1 hover:underline"
                          style={{ color: "var(--text)" }}
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
                    className="inline-flex items-center gap-2 px-6 py-2.5 font-black rounded-xl transition disabled:opacity-50"
                    style={{
                      background: "transparent",
                      border: "1px solid rgb(var(--primary-rgb) / 0.35)",
                      color: "var(--primary)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.10)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="material-symbols-outlined">cloud_upload</span>
                    Tải lên phiên bản mới
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs mt-4 px-1" style={{ color: "var(--muted)" }}>
              <strong>Lưu ý:</strong> Định dạng hỗ trợ: PDF. Dung lượng tối đa 20MB.
            </p>
          </section>

          {/* actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 pb-2">
            <button
              type="button"
              onClick={() => navigate(`/author/submissions/${paperId}`)}
              className="w-full sm:w-auto px-8 py-3 font-black transition flex items-center justify-center gap-2 rounded-xl"
              style={{ color: "var(--text)", border: "1px solid var(--border)", background: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Hủy bỏ và Quay lại
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                disabled={busy}
                onClick={onSaveDraft}
                className="w-full sm:w-auto px-8 py-3 font-black rounded-xl transition disabled:opacity-50"
                style={{ border: "1px solid var(--border)", color: "var(--text)", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Lưu nháp
              </button>

              <button
                type="submit"
                disabled={busy}
                className="w-full sm:w-auto px-10 py-3 font-black rounded-xl transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  boxShadow: "0 10px 25px rgb(var(--primary-rgb) / 0.20)",
                }}
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
