import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import reviewApi from "../../api/reviewApi";
import * as submissionApi from "../../api/submissionApi";
import ReviewForm from "./ReviewForm";

const ReviewWorkspace = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState(null);
  const [assignment, setAssignment] = useState(null);

  const [blockedByCoi, setBlockedByCoi] = useState(false);
  const [coiInfo, setCoiInfo] = useState(null);

  const [reviewId, setReviewId] = useState(null);
  const [criteriaIdMap, setCriteriaIdMap] = useState({}); // { novelty: id, ... }

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");

  // Form state
  const [form, setForm] = useState({
    // review main
    final_score: 0,
    confidence_score: 3,
    content_author: "",
    content_pc: "",
    is_anonymous: true,
    is_draft: true,

    // UI-only
    recommendation: "",

    // criterias
    criterias: {
      novelty: { criteria_name: "Novelty", grade: 0, weight: 0.3, comment: "" },
      methodology: { criteria_name: "Methodology", grade: 0, weight: 0.4, comment: "" },
      presentation: { criteria_name: "Presentation", grade: 0, weight: 0.3, comment: "" },
    },
  });

  const formatNow = () => new Date().toLocaleString("vi-VN");

  const enumValue = (x) => (x?.value ?? x ?? "").toString();

  const ensureAssignmentAccepted = async (a) => {
    // Backend rule: chỉ Accepted mới được tạo review
    const st = enumValue(a?.status).toLowerCase();
    if (st === "invited") {
      await reviewApi.acceptAssignment(a.id);
      const refreshed = await reviewApi.getAssignment(a.id);
      return refreshed.data;
    }
    return a;
  };

  const checkOpenCoiForPaper = async (paperId) => {
    // reviewer_id sẽ bị override ở backend => chỉ cần paper_id
    const res = await reviewApi.listCOI({ paper_id: Number(paperId) });
    const list = res.data || [];
    const open = list.find((c) => enumValue(c.status) === "Open");
    return open || null;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setBlockedByCoi(false);
        setCoiInfo(null);

        // 1) Assignment detail
        const assignmentRes = await reviewApi.getAssignment(assignmentId);
        let a = assignmentRes.data;

        // 1.1) auto-accept nếu Invited
        try {
          a = await ensureAssignmentAccepted(a);
        } catch (e) {
          // Không chặn cứng: nếu accept fail thì vẫn hiển thị thông báo và cho user quay lại
          const msg = e?.response?.data?.detail || e?.message || "Không thể accept assignment.";
          toast.error(msg);
        }

        setAssignment(a);

        // 2) Paper id
        const paperId = a.paper_id ?? a.paperId ?? a.paper?.id;
        if (!paperId) throw new Error("Assignment missing paper_id");

        // 3) COI check (Open => block)
        const openCoi = await checkOpenCoiForPaper(paperId);
        if (openCoi) {
          setBlockedByCoi(true);
          setCoiInfo(openCoi);
        }

        // 4) Paper detail (fallback qua submissionApi)
        if (a.paper) {
          setPaper(a.paper);
        } else {
          const p = await submissionApi.getPaperForReviewer(paperId);
          setPaper(p);
        }

        // 5) Nếu bị COI thì không cần load review/criterias nữa
        if (openCoi) return;

        // 6) Load existing review (nếu có)
        const reviewsRes = await reviewApi.listReviews({ assignmentId: Number(assignmentId) });
        const reviews = reviewsRes.data || [];

        if (reviews.length > 0) {
          const r0 = reviews[0];
          setReviewId(r0.id);

          const rDetailRes = await reviewApi.getReview(r0.id);
          const r = rDetailRes.data;

          // map criterias id theo criteria_name
          const map = {};
          (r.criterias || []).forEach((c) => {
            const name = (c.criteria_name || "").toLowerCase();
            if (name.includes("novel")) map.novelty = c.id;
            else if (name.includes("method")) map.methodology = c.id;
            else if (name.includes("present")) map.presentation = c.id;
          });
          setCriteriaIdMap(map);

          const findById = (id) => (r.criterias || []).find((c) => c.id === id);

          setForm((prev) => ({
            ...prev,
            final_score: r.final_score ?? 0,
            confidence_score: r.confidence_score ?? 3,
            content_author: r.content_author ?? "",
            content_pc: r.content_pc ?? "",
            is_anonymous: r.is_anonymous ?? true,
            is_draft: r.is_draft ?? true,
            criterias: {
              novelty: {
                ...prev.criterias.novelty,
                grade: findById(map.novelty)?.grade ?? prev.criterias.novelty.grade,
                comment: findById(map.novelty)?.comment ?? prev.criterias.novelty.comment,
              },
              methodology: {
                ...prev.criterias.methodology,
                grade: findById(map.methodology)?.grade ?? prev.criterias.methodology.grade,
                comment: findById(map.methodology)?.comment ?? prev.criterias.methodology.comment,
              },
              presentation: {
                ...prev.criterias.presentation,
                grade: findById(map.presentation)?.grade ?? prev.criterias.presentation.grade,
                comment: findById(map.presentation)?.comment ?? prev.criterias.presentation.comment,
              },
            },
          }));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Không thể tải trang chấm điểm.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assignmentId]);

  const validateBeforeSave = () => {
    const { criterias, content_author, recommendation } = form;

    const hasAnyGrade =
      (criterias.novelty.grade || 0) > 0 &&
      (criterias.methodology.grade || 0) > 0 &&
      (criterias.presentation.grade || 0) > 0;

    return {
      hasAnyGrade,
      hasAuthorComment: (content_author || "").trim().length > 0,
      hasRecommendation: !!recommendation,
    };
  };

  const upsertReviewAndCriterias = async ({ draft }) => {
    if (blockedByCoi) {
      // chặn tuyệt đối tại UI để khỏi spam request 400
      throw new Error("COI Open: cannot create/update review.");
    }

    // Guard: assignment must be Accepted
    const st = enumValue(assignment?.status).toLowerCase();
    if (st !== "accepted") {
      // thử accept lại một lần
      const msg = "Assignment chưa Accepted. Vui lòng Accept trước khi chấm.";
      throw new Error(msg);
    }

    const reviewPayload = {
      assignment_id: Number(assignmentId),
      final_score: form.final_score ?? 0,
      confidence_score: form.confidence_score ?? 3,
      content_author: form.content_author ?? "",
      content_pc: form.content_pc ?? "",
      is_anonymous: form.is_anonymous ?? true,
      is_draft: draft,
    };

    let rid = reviewId;
    if (!rid) {
      const created = await reviewApi.createReview(reviewPayload);
      rid = created.data.id;
      setReviewId(rid);
    } else {
      await reviewApi.updateReview(rid, reviewPayload);
    }

    // upsert criterias
    const entries = [
      { key: "novelty", data: form.criterias.novelty },
      { key: "methodology", data: form.criterias.methodology },
      { key: "presentation", data: form.criterias.presentation },
    ];

    const newMap = { ...criteriaIdMap };

    for (const item of entries) {
      const payload = {
        criteria_name: item.data.criteria_name,
        grade: item.data.grade || null,
        weight: item.data.weight,
        comment: item.data.comment || null,
      };

      const existingId = newMap[item.key];
      if (existingId) {
        await reviewApi.updateCriteria(rid, existingId, payload);
      } else {
        const createdC = await reviewApi.addCriteria(rid, payload);
        newMap[item.key] = createdC.data.id;
      }
    }

    setCriteriaIdMap(newMap);
    return rid;
  };

  const handleSaveDraft = async () => {
    if (blockedByCoi) {
      toast.error("Bài này đang có COI (Open). Không thể lưu nháp / chấm điểm.");
      return;
    }

    try {
      setIsSaving(true);
      await upsertReviewAndCriterias({ draft: true });
      setLastSavedAt(formatNow());
      toast.success("Đã lưu bản nháp.");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.detail || e?.message || "Lưu bản nháp thất bại.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (blockedByCoi) {
      toast.error("Bài này đang có COI (Open). Không thể gửi đánh giá.");
      return;
    }

    const v = validateBeforeSave();
    if (!v.hasAnyGrade) return toast.error("Vui lòng chấm đủ 3 tiêu chí (1-5).");
    if (!v.hasAuthorComment) return toast.error("Vui lòng nhập nhận xét gửi tác giả.");
    if (!v.hasRecommendation) return toast.error("Vui lòng chọn đánh giá tổng quát.");

    try {
      setIsSubmitting(true);

      // save as not draft first
      const rid = await upsertReviewAndCriterias({ draft: false });

      // submit
      await reviewApi.submitReview(rid);

      toast.success("Đã gửi đánh giá thành công!");
      navigate("/reviewer/assignments");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.detail || e?.message || "Gửi đánh giá thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );

  if (!paper)
    return <div className="text-center mt-5 text-danger">Không tìm thấy bài báo.</div>;

  // BLOCKED UI (COI Open)
  if (blockedByCoi) {
    const st = enumValue(coiInfo?.status) || "Open";
    const type = enumValue(coiInfo?.type) || "Manual_Declared";
    return (
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
          <div>
            <h4 className="mb-1 text-primary">Review Form</h4>
            <span className="badge bg-secondary me-2">{paper.track_name || "General Track"}</span>
            <span className="text-muted">Paper ID: #{paper.id}</span>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>
              <i className="bi bi-arrow-left"></i> Quay lại
            </button>
          </div>
        </div>

        <div className="alert alert-danger d-flex align-items-start gap-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill fs-4"></i>
          <div>
            <div className="fw-bold mb-1">Bị chặn do COI (Conflict of Interest)</div>
            <div className="small">
              Hệ thống phát hiện bạn đã khai báo COI cho bài này (status: <b>{st}</b>, type: <b>{type}</b>).
              Theo quy tắc hiện tại, bạn không thể tạo/lưu/gửi đánh giá cho bài báo này.
            </div>
            {coiInfo?.description ? (
              <div className="small mt-2">
                <b>Mô tả COI:</b> {coiInfo.description}
              </div>
            ) : null}

            <div className="mt-3 d-flex flex-wrap gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/reviewer/assignments")}>
                Về danh sách assignments
              </button>
              <Link className="btn btn-outline-danger btn-sm" to="/reviewer/coi">
                Xem COI của tôi
              </Link>
            </div>

            <div className="small text-muted mt-3">
              Gợi ý: Nếu COI này được khai báo nhầm, bạn cần cơ chế “resolve/close COI” (hiện backend chưa có endpoint).
              Khi COI không còn Open, bạn mới chấm được.
            </div>
          </div>
        </div>

        {/* Paper info vẫn cho xem */}
        <div className="card shadow-sm">
          <div className="card-header bg-light fw-bold">
            <i className="bi bi-file-text me-2"></i> Thông tin bài báo
          </div>
          <div className="card-body">
            <h5 className="card-title text-dark fw-bold">{paper.title}</h5>
            <p className="card-text mt-3">{paper.abstract}</p>
            <div className="mt-3">
              <span className="fw-bold">Keywords: </span>
              {(paper.keywords || "")
                .split(",")
                .filter(Boolean)
                .map((kw, idx) => (
                  <span key={idx} className="badge bg-light text-dark border me-1">
                    {kw.trim()}
                  </span>
                ))}
            </div>

            <div className="mt-4 d-grid gap-2">
              {paper.versions?.length > 0 && paper.versions[0]?.file_url ? (
                <a
                  href={paper.versions[0].file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-primary"
                >
                  <i className="bi bi-file-pdf"></i> Xem toàn văn (PDF)
                </a>
              ) : (
                <button className="btn btn-outline-secondary" disabled>
                  <i className="bi bi-file-pdf"></i> Chưa có PDF
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
        <div>
          <h4 className="mb-1 text-primary">Review Form</h4>
          <span className="badge bg-secondary me-2">{paper.track_name || "General Track"}</span>
          <span className="text-muted">Paper ID: #{paper.id}</span>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left"></i> Quay lại
          </button>
        </div>
      </div>

      {/* Optional: cảnh báo nếu assignment chưa Accepted */}
      {enumValue(assignment?.status).toLowerCase() !== "accepted" ? (
        <div className="alert alert-warning d-flex align-items-center gap-2" role="alert">
          <i className="bi bi-info-circle-fill"></i>
          <div className="small">
            Assignment hiện tại: <b>{enumValue(assignment?.status)}</b>. Bạn chỉ có thể tạo review khi status là <b>Accepted</b>.
          </div>
        </div>
      ) : null}

      <div className="row g-4">
        {/* LEFT: paper info */}
        <div className="col-lg-6" style={{ height: "82vh", overflowY: "auto" }}>
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light fw-bold">
              <i className="bi bi-file-text me-2"></i> Thông tin bài báo
            </div>
            <div className="card-body">
              <h5 className="card-title text-dark fw-bold">{paper.title}</h5>
              <p className="card-text mt-3">{paper.abstract}</p>

              <div className="mt-3">
                <span className="fw-bold">Keywords: </span>
                {(paper.keywords || "")
                  .split(",")
                  .filter(Boolean)
                  .map((kw, idx) => (
                    <span key={idx} className="badge bg-light text-dark border me-1">
                      {kw.trim()}
                    </span>
                  ))}
              </div>

              {/* PDF link */}
              <div className="mt-4 d-grid gap-2">
                {paper.versions?.length > 0 && paper.versions[0]?.file_url ? (
                  <a
                    href={paper.versions[0].file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-primary"
                  >
                    <i className="bi bi-file-pdf"></i> Xem toàn văn (PDF)
                  </a>
                ) : (
                  <button className="btn btn-outline-secondary" disabled>
                    <i className="bi bi-file-pdf"></i> Chưa có PDF
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bạn có thể giữ AI card mock ở đây nếu muốn */}
        </div>

        {/* RIGHT: Review form */}
        <div className="col-lg-6" style={{ height: "86vh", overflowY: "auto" }}>
          <ReviewForm
            form={form}
            setForm={setForm}
            isSaving={isSaving}
            isSubmitting={isSubmitting}
            lastSavedAt={lastSavedAt}
            onSaveDraft={handleSaveDraft}
            onSubmitFinal={handleSubmitFinal}
          />
        </div>
      </div>
    </div>
  );
};

export default ReviewWorkspace;
