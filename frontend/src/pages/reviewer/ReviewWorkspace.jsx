import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import reviewApi from "../../api/reviewApi";

const CRITERIAS = [
  { key: "Originality", label: "Tính mới (Novelty)", weight: 0.3 },
  { key: "TechnicalQuality", label: "Phương pháp (Methodology)", weight: 0.4 },
  { key: "Relevance", label: "Trình bày (Presentation)", weight: 0.3 },
];

const scoreRow = [1, 2, 3, 4, 5];

export default function ReviewWorkspace() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [assignment, setAssignment] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [review, setReview] = useState(null);

  const [grades, setGrades] = useState({
    Originality: 3,
    TechnicalQuality: 4,
    Relevance: 5,
  });

  const [criteriaComments, setCriteriaComments] = useState({
    Originality: "",
    TechnicalQuality: "",
    Relevance: "",
  });

  const [contentAuthor, setContentAuthor] = useState("");
  const [contentPc, setContentPc] = useState("");
  const [confidence, setConfidence] = useState(4);
  const [recommendation, setRecommendation] = useState("");

  const calcFinalScore = useMemo(() => {
    const vals = Object.values(grades);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 10) / 10;
  }, [grades]);

  const loadAll = async () => {
    setLoading(true);
    setErr("");

    try {
      const [assRes, pdfRes, listRevRes] = await Promise.all([
        reviewApi.getAssignment(Number(assignmentId)),
        reviewApi.getPaperPdfUrlByAssignment(Number(assignmentId)),
        reviewApi.listReviews({ assignmentId: Number(assignmentId) }),
      ]);

      setAssignment(assRes.data);
      setPdfUrl(pdfRes.data?.pdf_url || "");

      const reviews = listRevRes.data ?? [];
      let current = reviews[0];

      if (!current) {
        const created = await reviewApi.createReview({
          assignment_id: Number(assignmentId),
          is_anonymous: true,
          is_draft: true,
        });
        current = created.data;
      }

      setReview(current);

      // hydrate core
      setConfidence(current?.confidence_score ?? 4);
      setContentAuthor(current?.content_author ?? "");
      setContentPc(current?.content_pc ?? "");

      // hydrate criteria
      const map = new Map((current?.criterias ?? []).map((c) => [c.criteria_name, c]));
      setGrades((prev) => ({
        ...prev,
        Originality: map.get("Originality")?.grade ?? prev.Originality,
        TechnicalQuality: map.get("TechnicalQuality")?.grade ?? prev.TechnicalQuality,
        Relevance: map.get("Relevance")?.grade ?? prev.Relevance,
      }));
      setCriteriaComments((prev) => ({
        ...prev,
        Originality: map.get("Originality")?.comment ?? prev.Originality,
        TechnicalQuality: map.get("TechnicalQuality")?.comment ?? prev.TechnicalQuality,
        Relevance: map.get("Relevance")?.comment ?? prev.Relevance,
      }));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Không tải được workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const upsertCriterias = async (rev) => {
    const existingMap = new Map((rev?.criterias ?? []).map((c) => [c.criteria_name, c]));

    for (const c of CRITERIAS) {
      const existed = existingMap.get(c.key);

      const payload = {
        criteria_name: c.key,
        grade: grades[c.key],
        weight: c.weight,
        comment: criteriaComments[c.key] || null,
      };

      if (existed?.id) {
        await reviewApi.updateCriteria(rev.id, existed.id, payload);
      } else {
        await reviewApi.addCriteria(rev.id, payload);
      }
    }
  };

  const saveDraft = async () => {
    if (!review?.id) return;
    setSaving(true);
    setErr("");

    try {
      await reviewApi.updateReview(review.id, {
        final_score: calcFinalScore,
        confidence_score: confidence,
        content_author: contentAuthor,
        content_pc: contentPc,
        is_draft: true,
      });

      await upsertCriterias(review);

      const fresh = await reviewApi.getReview(review.id);
      setReview(fresh.data);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Lưu nháp thất bại");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!review?.id) return;
    setSaving(true);
    setErr("");

    try {
      await saveDraft();
      await reviewApi.submitReview(review.id); // backend bạn đã có /submit => set completed
      navigate("/reviewer/assignments");
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Nộp đánh giá thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-sm text-slate-500 font-semibold">Đang tải...</div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full">
      {/* Page Heading */}
      <div className="p-2 md:p-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Scientific Paper
            </span>
            <span className="text-slate-400 text-sm font-medium">
              Paper ID: #{assignment?.paper_id}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Review Form - Paper #{assignment?.paper_id}
          </h2>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">category</span>
            (Chưa có API track/title)
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href={pdfUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">download</span>
            Download PDF
          </a>
        </div>
      </div>

      {err ? (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-sm font-bold text-rose-700">{err}</p>
        </div>
      ) : null}

      {/* Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 pb-10 overflow-hidden">
        {/* Left */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
          {/* Paper metadata (placeholder) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              <h3 className="font-bold text-slate-800">Thông tin bài báo</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-600 w-1/4">
                      Abstract
                    </td>
                    <td className="px-6 py-4 text-slate-800 leading-relaxed">
                      (Chưa có API abstract. Nếu bạn có endpoint paper detail mình nối vào.)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-600">Từ khóa</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                          Keyword
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[520px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  picture_as_pdf
                </span>
                <h3 className="font-bold text-slate-800">Paper Viewer</h3>
              </div>
              {pdfUrl ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Mở tab mới
                </a>
              ) : null}
            </div>
            <div className="h-[520px] bg-slate-50">
              {pdfUrl ? (
                <iframe title="paper-pdf" src={pdfUrl} className="w-full h-full" />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Không có PDF url
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Review form */}
        <div className="w-full lg:w-[480px] flex flex-col gap-6 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">rate_review</span>
                <h3 className="font-bold">Mẫu chấm điểm (Review Form)</h3>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                {review?.is_draft ? "Bản nháp" : "Đã nộp"}
              </span>
            </div>

            <div className="p-6 space-y-8">
              {CRITERIAS.map((c, idx) => (
                <div key={c.key} className="space-y-4">
                  <div className="flex justify-between items-start">
                    <label className="text-sm font-bold text-slate-800">
                      {idx + 1}. {c.label} <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs text-slate-400 font-medium">
                      Trọng số: {Math.round(c.weight * 100)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {scoreRow.map((v) => (
                      <label
                        key={v}
                        className="flex flex-col items-center gap-1 cursor-pointer flex-1 py-1"
                      >
                        <input
                          className="w-4 h-4 text-primary focus:ring-primary border-slate-300"
                          name={c.key}
                          type="radio"
                          checked={grades[c.key] === v}
                          onChange={() =>
                            setGrades((prev) => ({ ...prev, [c.key]: v }))
                          }
                          disabled={review?.submitted_at != null || review?.is_draft === false}
                        />
                        <span className="text-[10px] font-bold text-slate-500">
                          {v}
                        </span>
                      </label>
                    ))}
                  </div>

                  <textarea
                    className="w-full text-sm rounded-lg border-slate-200 focus:border-primary focus:ring-primary bg-slate-50 transition-all"
                    placeholder={`Nhận xét cụ thể về ${c.label.toLowerCase()}...`}
                    value={criteriaComments[c.key]}
                    onChange={(e) =>
                      setCriteriaComments((prev) => ({
                        ...prev,
                        [c.key]: e.target.value,
                      }))
                    }
                    disabled={review?.submitted_at != null || review?.is_draft === false}
                  />
                </div>
              ))}

              <hr className="border-slate-100" />

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">
                    forum
                  </span>
                  Nhận xét gửi Tác giả (Anonymized)
                </label>
                <textarea
                  className="w-full text-sm rounded-lg border-slate-200 focus:border-primary focus:ring-primary transition-all"
                  placeholder="Viết phản hồi chi tiết..."
                  rows={4}
                  value={contentAuthor}
                  onChange={(e) => setContentAuthor(e.target.value)}
                  disabled={review?.submitted_at != null || review?.is_draft === false}
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-lg">
                    lock
                  </span>
                  Nhận xét riêng cho BTC (Chair Only)
                </label>
                <textarea
                  className="w-full text-sm rounded-lg border-slate-200 focus:border-primary focus:ring-primary bg-amber-50/10 transition-all italic"
                  placeholder="Ý kiến riêng..."
                  rows={2}
                  value={contentPc}
                  onChange={(e) => setContentPc(e.target.value)}
                  disabled={review?.submitted_at != null || review?.is_draft === false}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-800">Độ tự tin (1-5)</label>
                  <select
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="mt-2 w-full rounded-lg border-slate-200 focus:border-primary focus:ring-primary font-semibold text-sm"
                    disabled={review?.submitted_at != null || review?.is_draft === false}
                  >
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-800">Kết quả gợi ý</label>
                  <select
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    className="mt-2 w-full rounded-lg border-slate-200 focus:border-primary focus:ring-primary font-semibold text-sm"
                    disabled={review?.submitted_at != null || review?.is_draft === false}
                  >
                    <option value="">Chọn kết quả...</option>
                    <option value="strong_accept">Strong Accept</option>
                    <option value="accept">Accept</option>
                    <option value="borderline">Borderline</option>
                    <option value="weak_reject">Weak Reject</option>
                    <option value="reject">Reject</option>
                  </select>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs text-primary font-bold">
                  Điểm tổng kết (auto): {calcFinalScore}/5
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex gap-3 items-start">
                  <span className="material-symbols-outlined text-red-500 text-xl flex-shrink-0">
                    warning
                  </span>
                  <p className="text-xs text-red-700 leading-normal">
                    Lưu ý: Sau khi nhấn <strong>Gửi đánh giá</strong>, bạn sẽ không thể chỉnh sửa.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={saveDraft}
                    disabled={saving || review?.is_draft === false}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-xl">save</span>
                    Lưu bản nháp
                  </button>

                  <button
                    onClick={submit}
                    disabled={saving || review?.is_draft === false}
                    className="px-4 py-3 bg-primary text-white rounded-lg font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-xl">send</span>
                    Gửi đánh giá
                  </button>
                </div>

                <p className="text-[10px] text-center text-slate-400">
                  {review?.updated_at ? `Lần cuối lưu: ${new Date(review.updated_at).toLocaleString("vi-VN")}` : ""}
                </p>

                <button
                  type="button"
                  onClick={() => navigate(`/reviewer/discussion/${assignment?.paper_id}`)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 inline-flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    forum
                  </span>
                  Mở thảo luận
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 pb-6">
        © 2024 UTH-ConfMS
      </div>
    </div>
  );
}
