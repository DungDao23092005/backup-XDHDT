// src/pages/author/PaperDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import conferenceApi from "../../api/conferenceApi";
import {
  getSubmissionById,
  withdrawSubmission,
  addSubmissionAuthor,
  deleteSubmissionAuthor,
  uploadNewVersion,
  uploadCameraReady,
} from "../../api/submissionApi";
import { useAuth } from "../../context/AuthContext";

const STATUS_META = {
  SUBMITTED: { label: "Đã nộp", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  UNDER_REVIEW: { label: "Đang phản biện", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  ACCEPTED: { label: "Đã chấp nhận", cls: "bg-green-50 text-green-700 border border-green-200" },
  REJECTED: { label: "Từ chối", cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  WITHDRAWN: { label: "Rút bài", cls: "bg-slate-50 text-slate-600 border border-slate-200" },
  REVISION_REQUIRED: { label: "Cần sửa", cls: "bg-purple-50 text-purple-700 border border-purple-200" },
};

const MAX_MB = 20;
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

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
    if (["ACCEPTED", "REJECTED"].includes(status)) return "Không thể rút bài khi bài đã được chấp nhận / từ chối.";
    if (!withinSubmissionWindow) return "Đã quá hạn nộp bài (submission deadline) nên không thể rút/chỉnh sửa.";
    return "";
  }, [status, withinSubmissionWindow]);


  // Add-author form
  const [newAuthor, setNewAuthor] = useState({
    full_name: "",
    email: "",
    organization: "",
    is_corresponding: false,
  });

  const fileRevisionRef = useRef(null);
  const fileCameraRef = useRef(null);

  const meta = STATUS_META[status] || { label: status || "UNKNOWN", cls: "bg-szlate-50 text-slate-600 border border-slate-200" };

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

  const onAddAuthor = async () => {
    if (!canAddRemoveAuthor) {
    setErr("Không thể thêm/xóa tác giả khi bài đã đóng hoặc đã quá hạn nộp bài.");
    return;
    }
    const fn = newAuthor.full_name.trim();
    const em = newAuthor.email.trim();
    if (!fn || !em) return setErr("Vui lòng nhập Họ tên và Email của tác giả.");

    try {
      setBusy(true);
      setErr("");
      await addSubmissionAuthor(paperId, {
        full_name: fn,
        email: em,
        organization: newAuthor.organization?.trim() || "",
        is_corresponding: !!newAuthor.is_corresponding,
      });
      setNewAuthor({ full_name: "", email: "", organization: "", is_corresponding: false });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Thêm tác giả thất bại.");
    } finally {
      setBusy(false);
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

  if (loading) {
    return <div className="p-8 text-slate-500 font-semibold">Đang tải...</div>;
  }

  if (!paper) {
    return (
      <div className="bg-slate-50/50 min-h-[calc(100vh-64px)]">
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl font-semibold">
            {err || "Không tìm thấy bài báo."}
          </div>
          <button
            onClick={() => navigate("/author/submissions")}
            className="mt-4 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/50 min-h-[calc(100vh-64px)]">
      {/* Top bar (đồng bộ tone với MySubmissions/SubmitPaper) */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
        <button
          onClick={() => navigate("/author/submissions")}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-bold"
        >
          <span className="material-symbols-outlined text-slate-400">arrow_back</span>
          Quay lại danh sách
        </button>

        <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold border border-rose-200">
          Chi tiết bài nộp
        </span>
      </div>

      <div className="max-w-5xl mx-auto p-6 md:p-8 pb-12 space-y-6">
        {err && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl font-semibold">
            {err}
          </div>
        )}
        {!withinSubmissionWindow && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl font-semibold">
            Hội nghị đã quá hạn nộp bài (submission deadline). Một số thao tác sẽ bị khóa.
          </div>
        )}


        {/* Title & status */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className={["px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", meta.cls].join(" ")}>
                {meta.label}
              </span>
              <span className="text-slate-400 font-medium">#{String(paper.id).padStart(4, "0")}</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              {paper.title || "(Chưa có tiêu đề)"}
            </h1>

            <p className="text-slate-500">
              Cập nhật lần cuối: {formatDateTime(paper.updated_at || paper.created_at)}
            </p>
          </div>

          <button
            disabled={busy || !canWithdraw}
            onClick={onWithdraw}
            title={!canWithdraw ? withdrawBlockedReason : "Rút bài"}
            className="flex items-center gap-2 px-4 h-10 rounded-lg border-2 border-rose-500 text-rose-600 hover:bg-rose-50 font-bold text-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">cancel</span>
            Rút bài
          </button>
        </div>

        {/* Thông tin chung */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-rose-600">info</span>
            <h3 className="text-lg font-bold text-slate-900">Thông tin chung</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tóm tắt</label>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">{paper.abstract || "--"}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Chủ đề</label>
                <p className="text-slate-800 font-medium">{topicsText}</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Hội nghị</label>
                <p className="text-slate-800 font-medium">
                  {confName || `Conference #${paper.conference_id ?? "--"}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Camera-ready (giữ tone rose, nhưng vẫn thể hiện trạng thái ACCEPTED) */}
        {canCameraReady && (
          <div className="bg-rose-50/40 border-2 border-dashed border-rose-200 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
            <div className="size-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 border border-rose-200">
              <span className="material-symbols-outlined text-[32px]">verified</span>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Sẵn sàng nộp bản Camera-ready</h3>
              <p className="text-slate-600 max-w-md">
                Chúc mừng! Bài báo của bạn đã được chấp nhận. Vui lòng tải lên bản in cuối cùng (Camera-ready PDF).
              </p>
            </div>

            {blockCamera && (
              <div className="max-w-md bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-sm font-semibold">
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

            <button
              disabled={busy || blockCamera}
              onClick={() => fileCameraRef.current?.click()}
              className="bg-rose-500 text-white px-6 h-12 rounded-lg font-bold flex items-center gap-2 hover:opacity-95 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined">upload_file</span>
              Tải lên Camera-ready PDF
            </button>
          </div>
        )}

        {/* Danh sách tác giả */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600">group</span>
                <h3 className="text-lg font-black text-slate-900">Danh sách Tác giả</h3>
            </div>

            <button
                disabled={busy || !canAddRemoveAuthor}
                onClick={() => navigate(`/author/submissions/${paperId}/authors/new`)}
                className="bg-rose-500 text-white px-4 h-9 rounded-lg font-black text-sm flex items-center gap-2 hover:bg-rose-600 shadow-sm disabled:opacity-50"
            >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Thêm đồng tác giả
            </button>
        </div>



          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase">
                <tr>
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Đơn vị</th>
                  <th className="px-6 py-4 text-center">Corresponding</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {authors.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-slate-500" colSpan={5}>
                      Chưa có tác giả. Hãy thêm tác giả ở khung phía trên.
                    </td>
                  </tr>
                ) : (
                  authors.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-semibold text-slate-900">{a.full_name}</td>
                      <td className="px-6 py-4 text-slate-600">{a.email}</td>
                      <td className="px-6 py-4 text-slate-600">{a.organization || "--"}</td>
                      <td className="px-6 py-4 text-center">
                        {a.is_corresponding ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={busy || !canAddRemoveAuthor}
                            onClick={() => navigate(`/author/submissions/${paperId}/authors/${a.id}/edit?from=detail`)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-50"
                            title="Chỉnh sửa"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>

                          <button
                            disabled={busy || !canAddRemoveAuthor}
                            onClick={() => onDeleteAuthor(a.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-50"
                            title="Xóa"
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

        {/* Lịch sử phiên bản + upload revision */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600">history</span>
              <h3 className="text-lg font-bold text-slate-900">Lịch sử Phiên bản</h3>
            </div>

            <input
              ref={fileRevisionRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => onUploadRevision(e.target.files?.[0])}
            />

            <button
              disabled={busy || !canUploadRevision}
              onClick={() => fileRevisionRef.current?.click()}
              className="bg-rose-500 text-white px-4 h-9 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-95 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Tải lên phiên bản mới
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {versions.length === 0 ? (
              <div className="px-6 py-6 text-slate-500">Chưa có phiên bản nào.</div>
            ) : (
              versions.map((v, idx) => <VersionRow key={v.id || idx} v={v} />)
            )}
          </div>
        </div>

        <div className="text-center pt-2 pb-4">
          <p className="text-slate-400 text-sm">
            Bạn cần hỗ trợ?{" "}
            <span className="text-rose-600 font-bold hover:underline cursor-pointer">
              Liên hệ Ban tổ chức
            </span>
          </p>
        </div>
      </div>
  );
}

function VersionRow({ v }) {
  const name = v.file_name || v.filename || v.original_filename || "PDF";
  const url = toDownloadUrl(v.file_url || v.url);

  return (
    <div className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
          <span className="material-symbols-outlined">picture_as_pdf</span>
        </div>

        <div>
          <p className="font-black text-slate-900">
            Phiên bản {v.version_number ? `v${v.version_number}` : ""}
            {v.is_camera_ready ? " (Camera-ready)" : ""}
          </p>
          <p className="text-sm text-slate-400">
            {name} • {v.created_at ? formatDate(v.created_at) : "--"}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {url ? (
          <a
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
            title="Tải xuống / Xem"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            <span className="material-symbols-outlined">download</span>
          </a>
        ) : (
          <button className="p-2 text-slate-300 cursor-not-allowed" title="Backend chưa trả file_url">
            <span className="material-symbols-outlined">download</span>
          </button>
        )}
      </div>
    </div>
  );
}