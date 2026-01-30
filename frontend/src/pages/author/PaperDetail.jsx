// src/pages/author/PaperDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import conferenceApi from "../../api/conferenceApi";
import {
  getSubmissionById,
  withdrawSubmission,
  deleteSubmissionAuthor,
  uploadNewVersion,
  uploadCameraReady,
} from "../../api/submissionApi";
import { useAuth } from "../../context/AuthContext";

const MAX_MB = 20;
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

const STATUS_META = {
  SUBMITTED: { label: "Đã nộp", tone: "blue" },
  UNDER_REVIEW: { label: "Đang phản biện", tone: "amber" },
  ACCEPTED: { label: "Đã chấp nhận", tone: "green" },
  REJECTED: { label: "Từ chối", tone: "rose" },
  WITHDRAWN: { label: "Rút bài", tone: "slate" },
  REVISION_REQUIRED: { label: "Cần sửa", tone: "violet" },
};

function normalizeStatus(s) {
  return String(s || "").toUpperCase();
}

function formatDateTime(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
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

function toDownloadUrl(raw) {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  let p = String(raw).trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.startsWith("/papers/")) {
    p = `/uploads${p}`;
  }
  if (!p.startsWith("/submission/")) {
    p = `/submission${p}`;
  }
  return encodeURI(`${API_BASE}${p}`);
}

// tone -> style (dark friendly)
function toneStyle(tone) {
  const map = {
    blue: "59 130 246",
    amber: "245 158 11",
    green: "34 197 94",
    rose: "244 63 94",
    violet: "139 92 246",
    slate: "100 116 139",
  };
  const rgb = map[tone] || map.slate;
  return {
    borderColor: `rgb(${rgb} / 0.25)`,
    backgroundColor: `rgb(${rgb} / 0.12)`,
    color: `rgb(${rgb} / 0.95)`,
  };
}

function PrimaryButton({ disabled, onClick, children, className = "" }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={[
        "px-4 h-10 rounded-lg font-black text-sm flex items-center gap-2 transition active:scale-[0.98] disabled:opacity-50",
        className,
      ].join(" ")}
      style={{
        background: "var(--primary)",
        color: "#fff",
        boxShadow: "0 10px 25px rgb(var(--primary-rgb) / 0.20)",
      }}
    >
      {children}
    </button>
  );
}

export default function PaperDetail() {
  const { id } = useParams();
  const paperId = Number(id);

  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState(null);
  const [confName, setConfName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confInfo, setConfInfo] = useState(null);

  const status = normalizeStatus(paper?.status);

  const isClosedPaper = useMemo(
    () => ["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(status),
    [status]
  );

  const submissionDeadlinePassed = useMemo(() => {
    const dl = confInfo?.submission_deadline;
    if (!dl) return false;
    const t = new Date(dl).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() > t;
  }, [confInfo]);

  const withinSubmissionWindow = useMemo(() => {
    return status === "REVISION_REQUIRED" ? true : !submissionDeadlinePassed;
  }, [status, submissionDeadlinePassed]);

  const canWithdraw = useMemo(
    () => !isClosedPaper && status !== "WITHDRAWN" && withinSubmissionWindow,
    [isClosedPaper, status, withinSubmissionWindow]
  );

  const canUploadRevision = useMemo(
    () => !isClosedPaper && withinSubmissionWindow,
    [isClosedPaper, withinSubmissionWindow]
  );

  const canAddRemoveAuthor = useMemo(
    () => !isClosedPaper && status !== "WITHDRAWN" && withinSubmissionWindow,
    [isClosedPaper, status, withinSubmissionWindow]
  );

  const withdrawBlockedReason = useMemo(() => {
    if (status === "WITHDRAWN") return "Bài đã rút trước đó.";
    if (["ACCEPTED", "REJECTED"].includes(status))
      return "Không thể rút bài khi bài đã được chấp nhận / từ chối.";
    if (!withinSubmissionWindow)
      return "Đã quá hạn nộp bài (submission deadline) nên không thể rút/chỉnh sửa.";
    return "";
  }, [status, withinSubmissionWindow]);

  const fileRevisionRef = useRef(null);
  const fileCameraRef = useRef(null);

  const canCameraReady = status === "ACCEPTED";

  // rule: trước khi nộp camera-ready cần đủ họ tên + email ở profile
  const profileOk = !!(user?.full_name && user?.email);
  const blockCamera = canCameraReady && !profileOk;

  const versions = useMemo(() => {
    const v =
      paper?.versions ||
      paper?.paper_versions ||
      paper?.version_history ||
      paper?.paper_versions_history ||
      [];
    return Array.isArray(v) ? v : [];
  }, [paper]);

  const authors = useMemo(() => {
    const a = paper?.authors || paper?.paper_authors || [];
    return Array.isArray(a) ? a : [];
  }, [paper]);

  const topicsText = useMemo(() => {
    const t = paper?.topics || [];
    if (!Array.isArray(t) || t.length === 0) return "--";
    return t.map((x) => x.name || x.topic_name || `#${x.topic_id}`).join(", ");
  }, [paper]);

  const meta = STATUS_META[status] || { label: status || "UNKNOWN", tone: "slate" };

  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      const p = await getSubmissionById(paperId);
      setPaper(p);

      if (p?.conference_id) {
        try {
          const conf = await conferenceApi.getConferenceById(p.conference_id);
          setConfName(conf?.name || "");
          setConfInfo(conf || null);
        } catch {
          setConfName("");
          setConfInfo(null);
        }
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || "Không tải được chi tiết bài báo.");
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

  const onWithdraw = async () => {
    if (!canWithdraw) {
      setErr(withdrawBlockedReason || "Không thể rút bài ở thời điểm này.");
      return;
    }
    if (!window.confirm("Bạn chắc chắn muốn rút bài này?")) return;

    try {
      setBusy(true);
      setErr("");
      await withdrawSubmission(paperId);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Rút bài thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const onUploadRevision = async (file) => {
    if (!canUploadRevision) {
      setErr("Không thể tải phiên bản mới khi bài đã đóng hoặc đã quá hạn nộp bài.");
      return;
    }
    const msg = fileOkPdf(file);
    if (msg) return setErr(msg);

    try {
      setBusy(true);
      setErr("");
      await uploadNewVersion({ paperId, file });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Upload phiên bản mới thất bại.");
    } finally {
      setBusy(false);
      if (fileRevisionRef.current) fileRevisionRef.current.value = "";
    }
  };

  const onUploadCameraReady = async (file) => {
    const msg = fileOkPdf(file);
    if (msg) return setErr(msg);
    if (blockCamera) return setErr("Bạn cần cập nhật đầy đủ Họ tên + Email trước khi nộp Camera-ready.");

    try {
      setBusy(true);
      setErr("");
      await uploadCameraReady({ paperId, file });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Upload Camera-ready thất bại.");
    } finally {
      setBusy(false);
      if (fileCameraRef.current) fileCameraRef.current.value = "";
    }
  };

  const onDeleteAuthor = async (authorId) => {
    if (!canAddRemoveAuthor) {
      setErr("Không thể thêm/xóa tác giả khi bài đã đóng hoặc đã quá hạn nộp bài.");
      return;
    }
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

  // ===== Loading / Not found =====
  if (loading) {
    return (
      <div className="p-8 font-semibold" style={{ color: "var(--muted)" }}>
        Đang tải...
      </div>
    );
  }

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
            className="mt-4 px-4 py-2 rounded-lg border font-bold transition"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  // ===== Page =====
  return (
    <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 64px)", color: "var(--text)" }}>
      {/* Top bar */}
      <div
        className="h-16 flex items-center justify-between px-6 sticky top-0 z-10 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => navigate("/author/submissions")}
          className="flex items-center gap-2 font-black transition"
          style={{ color: "var(--text)" }}
        >
          <span className="material-symbols-outlined" style={{ color: "var(--muted)" }}>
            arrow_back
          </span>
          Quay lại danh sách
        </button>

        <span
          className="px-3 py-1 rounded-full text-xs font-black border"
          style={{
            background: "rgb(var(--primary-rgb) / 0.10)",
            borderColor: "rgb(var(--primary-rgb) / 0.25)",
            color: "var(--primary)",
          }}
        >
          Chi tiết bài nộp
        </span>
      </div>

      <div className="max-w-5xl mx-auto p-6 md:p-8 pb-12 space-y-6">
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

        {!withinSubmissionWindow && (
          <div
            className="p-4 rounded-xl font-semibold border"
            style={{
              background: "rgb(245 158 11 / 0.12)",
              borderColor: "rgb(245 158 11 / 0.25)",
              color: "rgb(245 158 11 / 0.95)",
            }}
          >
            Hội nghị đã quá hạn nộp bài (submission deadline). Một số thao tác sẽ bị khóa.
          </div>
        )}

        {/* Title & status */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span
                className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border"
                style={toneStyle(meta.tone)}
              >
                {meta.label}
              </span>
              <span className="font-medium" style={{ color: "var(--muted)" }}>
                #{String(paper.id).padStart(4, "0")}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: "var(--text)" }}>
              {paper.title || "(Chưa có tiêu đề)"}
            </h1>

            <p style={{ color: "var(--muted)" }}>
              Cập nhật lần cuối: {formatDateTime(paper.updated_at || paper.created_at)}
            </p>
          </div>

          <button
            disabled={busy || !canWithdraw}
            onClick={onWithdraw}
            title={!canWithdraw ? withdrawBlockedReason : "Rút bài"}
            className="flex items-center gap-2 px-4 h-10 rounded-lg border-2 font-black text-sm transition disabled:opacity-50"
            style={{
              borderColor: "rgb(244 63 94 / 0.70)",
              color: "rgb(244 63 94 / 0.95)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) e.currentTarget.style.background = "rgb(244 63 94 / 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span className="material-symbols-outlined text-[20px]">cancel</span>
            Rút bài
          </button>
        </div>

        {/* Thông tin chung */}
        <div
          className="rounded-2xl border shadow-sm p-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>
              info
            </span>
            <h3 className="text-lg font-black" style={{ color: "var(--text)" }}>
              Thông tin chung
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase mb-1" style={{ color: "var(--muted)" }}>
                Tóm tắt
              </label>
              <p className="leading-relaxed whitespace-pre-line" style={{ color: "var(--muted)" }}>
                {paper.abstract || "--"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1" style={{ color: "var(--muted)" }}>
                  Chủ đề
                </label>
                <p className="font-medium" style={{ color: "var(--text)" }}>
                  {topicsText}
                </p>
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1" style={{ color: "var(--muted)" }}>
                  Hội nghị
                </label>
                <p className="font-medium" style={{ color: "var(--text)" }}>
                  {confName || `Conference #${paper.conference_id ?? "--"}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Camera-ready */}
        {canCameraReady && (
          <div
            className="rounded-2xl p-8 flex flex-col items-center text-center gap-4 border-2 border-dashed"
            style={{
              background: "rgb(var(--primary-rgb) / 0.06)",
              borderColor: "rgb(var(--primary-rgb) / 0.25)",
            }}
          >
            <div
              className="size-16 rounded-full flex items-center justify-center border"
              style={{
                background: "rgb(var(--primary-rgb) / 0.12)",
                borderColor: "rgb(var(--primary-rgb) / 0.25)",
                color: "var(--primary)",
              }}
            >
              <span className="material-symbols-outlined text-[32px]">verified</span>
            </div>

            <div>
              <h3 className="text-xl font-black mb-2" style={{ color: "var(--text)" }}>
                Sẵn sàng nộp bản Camera-ready
              </h3>
              <p className="max-w-md" style={{ color: "var(--muted)" }}>
                Chúc mừng! Bài báo của bạn đã được chấp nhận. Vui lòng tải lên bản in cuối cùng (Camera-ready PDF).
              </p>
            </div>

            {blockCamera && (
              <div
                className="max-w-md p-4 rounded-2xl text-sm font-semibold border"
                style={{
                  background: "rgb(245 158 11 / 0.12)",
                  borderColor: "rgb(245 158 11 / 0.25)",
                  color: "rgb(245 158 11 / 0.95)",
                }}
              >
                Bạn cần cập nhật đầy đủ thông tin tài khoản (Họ tên + Email) trước khi nộp Camera-ready.
              </div>
            )}

            <input
              ref={fileCameraRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => onUploadCameraReady(e.target.files?.[0])}
            />

            <PrimaryButton disabled={busy || blockCamera} onClick={() => fileCameraRef.current?.click()}>
              <span className="material-symbols-outlined">upload_file</span>
              Tải lên Camera-ready PDF
            </PrimaryButton>
          </div>
        )}

        {/* Authors card */}
        <div
          className="rounded-2xl border shadow-sm overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="px-6 py-4 border-b flex justify-between items-center"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>
                group
              </span>
              <h3 className="text-lg font-black" style={{ color: "var(--text)" }}>
                Danh sách Tác giả
              </h3>
            </div>

            <button
              disabled={busy || !canAddRemoveAuthor}
              onClick={() => navigate(`/author/submissions/${paperId}/authors/new`)}
              className="px-4 h-9 rounded-lg font-black text-sm flex items-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "#fff",
              }}
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Thêm đồng tác giả
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                <tr className="text-xs font-black uppercase">
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Đơn vị</th>
                  <th className="px-6 py-4 text-center">Corresponding</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {authors.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6" style={{ color: "var(--muted)" }} colSpan={5}>
                      Chưa có tác giả.
                    </td>
                  </tr>
                ) : (
                  authors.map((a) => (
                    <tr
                      key={a.id}
                      style={{ borderTop: `1px solid var(--border)` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-6 py-4 font-semibold" style={{ color: "var(--text)" }}>
                        {a.full_name}
                      </td>
                      <td className="px-6 py-4" style={{ color: "var(--muted)" }}>
                        {a.email}
                      </td>
                      <td className="px-6 py-4" style={{ color: "var(--muted)" }}>
                        {a.organization || "--"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {a.is_corresponding ? (
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-xs font-black border"
                            style={{
                              background: "rgb(var(--primary-rgb) / 0.12)",
                              borderColor: "rgb(var(--primary-rgb) / 0.25)",
                              color: "var(--primary)",
                            }}
                          >
                            Yes
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={busy || !canAddRemoveAuthor}
                            onClick={() => navigate(`/author/submissions/${paperId}/authors/${a.id}/edit?from=detail`)}
                            className="p-2 rounded-lg transition disabled:opacity-50"
                            title="Chỉnh sửa"
                            style={{ color: "rgb(245 158 11 / 0.95)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(245 158 11 / 0.12)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>

                          <button
                            disabled={busy || !canAddRemoveAuthor}
                            onClick={() => onDeleteAuthor(a.id)}
                            className="p-2 rounded-lg transition disabled:opacity-50"
                            title="Xóa"
                            style={{ color: "rgb(244 63 94 / 0.95)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(244 63 94 / 0.10)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Versions card */}
        <div
          className="rounded-2xl border shadow-sm overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="px-6 py-4 border-b flex justify-between items-center"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>
                history
              </span>
              <h3 className="text-lg font-black" style={{ color: "var(--text)" }}>
                Lịch sử Phiên bản
              </h3>
            </div>

            <input
              ref={fileRevisionRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => onUploadRevision(e.target.files?.[0])}
            />

            <PrimaryButton disabled={busy || !canUploadRevision} onClick={() => fileRevisionRef.current?.click()}>
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Tải lên phiên bản mới
            </PrimaryButton>
          </div>

          <div style={{ borderTop: `1px solid var(--border)` }}>
            {versions.length === 0 ? (
              <div className="px-6 py-6" style={{ color: "var(--muted)" }}>
                Chưa có phiên bản nào.
              </div>
            ) : (
              versions.map((v, idx) => <VersionRow key={v.id || idx} v={v} />)
            )}
          </div>
        </div>

        <div className="text-center pt-2 pb-4">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Bạn cần hỗ trợ?{" "}
            <span className="font-black hover:underline cursor-pointer" style={{ color: "var(--primary)" }}>
              Liên hệ Ban tổ chức
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function VersionRow({ v }) {
  const name = v.file_name || v.filename || v.original_filename || "PDF";
  const url = toDownloadUrl(v.file_url || v.url);

  return (
    <div
      className="px-6 py-3 flex items-center justify-between transition"
      style={{ borderTop: "1px solid var(--border)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-lg flex items-center justify-center border"
          style={{
            background: "rgb(var(--primary-rgb) / 0.10)",
            color: "var(--primary)",
            borderColor: "rgb(var(--primary-rgb) / 0.25)",
          }}
        >
          <span className="material-symbols-outlined">picture_as_pdf</span>
        </div>

        <div>
          <p className="font-black" style={{ color: "var(--text)" }}>
            Phiên bản {v.version_number ? `v${v.version_number}` : ""}
            {v.is_camera_ready ? " (Camera-ready)" : ""}
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {name} • {v.created_at ? formatDate(v.created_at) : "--"}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {url ? (
          <a
            className="p-2 rounded-lg transition"
            title="Tải xuống / Xem"
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--primary)";
              e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.10)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span className="material-symbols-outlined">download</span>
          </a>
        ) : (
          <button className="p-2 cursor-not-allowed" title="Backend chưa trả file_url" style={{ color: "var(--muted)" }}>
            <span className="material-symbols-outlined">download</span>
          </button>
        )}
      </div>
    </div>
  );
}
