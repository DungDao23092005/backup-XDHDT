import React from "react";

const CRITERIA = [
  { key: "novelty", label: "Tính mới (Novelty)", weight: 0.3, help: "Mức độ đóng góp mới, khác biệt so với các công trình trước." },
  { key: "methodology", label: "Phương pháp luận (Methodology)", weight: 0.4, help: "Tính hợp lý của thiết kế nghiên cứu, thí nghiệm và phân tích." },
  { key: "presentation", label: "Trình bày (Presentation)", weight: 0.3, help: "Tính rõ ràng, mạch lạc, cấu trúc và ngôn ngữ." },
];

const RECOMMENDATIONS = [
  { value: "strong_accept", label: "Strong Accept", score: 3 },
  { value: "accept", label: "Accept", score: 2 },
  { value: "borderline", label: "Borderline", score: 0 },
  { value: "weak_reject", label: "Weak Reject", score: -2 },
  { value: "reject", label: "Reject", score: -3 },
];

const ScorePills = ({ name, value, onChange }) => {
  // value: 1..5
  return (
    <div className="d-flex gap-2 flex-wrap">
      {[1, 2, 3, 4, 5].map((v) => {
        const active = Number(value) === v;
        return (
          <label
            key={v}
            className={`btn btn-sm rounded-pill px-3 py-2 d-flex align-items-center justify-content-center ${
              active ? "btn-primary" : "btn-outline-secondary"
            }`}
            style={{ minWidth: 52 }}
          >
            <input
              type="radio"
              className="d-none"
              name={name}
              checked={active}
              onChange={() => onChange(v)}
            />
            <span className="fw-bold">{v}</span>
          </label>
        );
      })}
    </div>
  );
};

export default function ReviewForm({
  form,
  setForm,
  isSaving,
  isSubmitting,
  lastSavedAt,
  onSaveDraft,
  onSubmitFinal,
}) {
  const setCriteriaGrade = (key, grade) => {
    setForm((prev) => ({
      ...prev,
      criterias: { ...prev.criterias, [key]: { ...prev.criterias[key], grade } },
    }));
  };

  const setCriteriaComment = (key, comment) => {
    setForm((prev) => ({
      ...prev,
      criterias: { ...prev.criterias, [key]: { ...prev.criterias[key], comment } },
    }));
  };

  const recommendationScore = () => {
    const found = RECOMMENDATIONS.find((r) => r.value === form.recommendation);
    return found ? found.score : 0;
  };

  return (
    <div className="card shadow-sm border-0">
      {/* Header */}
      <div className="card-header bg-primary text-white d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-clipboard-check fs-5"></i>
          <div>
            <div className="fw-bold">Mẫu chấm điểm</div>
            <div className="small opacity-75">Review Form</div>
          </div>
        </div>
        <span className="badge rounded-pill bg-light text-primary px-3 py-2">
          {form.is_draft ? "Bản nháp" : "Hoàn tất"}
        </span>
      </div>

      <div className="card-body p-4">
        {/* Criteria section */}
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="mb-0 fw-bold">
              Tiêu chí chấm điểm <span className="text-danger">*</span>
            </h6>
            <span className="text-muted small">
              Thang điểm: <span className="fw-semibold">1 (thấp) → 5 (cao)</span>
            </span>
          </div>

          <div className="vstack gap-3">
            {CRITERIA.map((c, idx) => {
              const grade = form.criterias[c.key]?.grade ?? 0;
              const comment = form.criterias[c.key]?.comment ?? "";

              return (
                <div key={c.key} className="border rounded-3 p-3 bg-light">
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <div className="fw-bold">
                        {idx + 1}. {c.label} <span className="text-danger">*</span>
                      </div>
                      <div className="text-muted small">{c.help}</div>
                    </div>
                    <div className="text-end">
                      <div className="badge bg-white text-secondary border rounded-pill px-3 py-2">
                        Trọng số: {Math.round(c.weight * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <ScorePills
                      name={`grade_${c.key}`}
                      value={grade}
                      onChange={(v) => setCriteriaGrade(c.key, v)}
                    />
                  </div>

                  <div className="mt-3">
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Nhận xét cụ thể (ngắn gọn, có dẫn chứng nếu cần)..."
                      value={comment}
                      onChange={(e) => setCriteriaComment(c.key, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <hr className="my-4" />

        {/* Comments */}
        <div className="mb-3">
          <label className="form-label fw-bold">
            <i className="bi bi-chat-left-text me-2 text-primary"></i>
            Nhận xét gửi Tác giả (Anonymized) <span className="text-danger">*</span>
          </label>
          <textarea
            className="form-control"
            rows={5}
            placeholder="Viết phản hồi chi tiết để tác giả có thể cải thiện bài báo..."
            value={form.content_author}
            onChange={(e) => setForm((p) => ({ ...p, content_author: e.target.value }))}
          />
          <div className="form-text text-muted">
            Không ghi thông tin định danh reviewer. Có thể dùng gạch đầu dòng.
          </div>
        </div>

        <div className="mb-4">
          <label className="form-label fw-bold text-danger">
            <i className="bi bi-shield-lock me-2"></i>
            Nhận xét riêng cho BTC (Chair Only)
          </label>
          <textarea
            className="form-control bg-light"
            rows={3}
            placeholder="Nêu quan ngại bảo mật/đạo văn hoặc ý kiến riêng..."
            value={form.content_pc}
            onChange={(e) => setForm((p) => ({ ...p, content_pc: e.target.value }))}
          />
        </div>

        {/* Recommendation + confidence */}
        <div className="row g-3">
          <div className="col-md-7">
            <label className="form-label fw-bold">
              Đánh giá tổng quát (Final Recommendation) <span className="text-danger">*</span>
            </label>
            <select
              className="form-select"
              value={form.recommendation}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  recommendation: e.target.value,
                  final_score: RECOMMENDATIONS.find((r) => r.value === e.target.value)?.score ?? 0,
                }))
              }
            >
              <option value="">Chọn kết quả...</option>
              {RECOMMENDATIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <div className="small text-muted mt-2">
              Map recommendation → <span className="fw-semibold">final_score</span> ={" "}
              <span className="fw-bold">{recommendationScore()}</span>
            </div>
          </div>

          <div className="col-md-5">
            <label className="form-label fw-bold">Độ tin cậy (Confidence)</label>
            <select
              className="form-select"
              value={form.confidence_score}
              onChange={(e) => setForm((p) => ({ ...p, confidence_score: Number(e.target.value) }))}
            >
              <option value={1}>1 - Thấp</option>
              <option value={2}>2 - Trung bình</option>
              <option value={3}>3 - Cao</option>
              <option value={4}>4 - Rất cao</option>
              <option value={5}>5 - Chuyên gia</option>
            </select>
          </div>
        </div>

        {/* Warning */}
        <div className="alert alert-warning mt-4 mb-0 d-flex gap-2 align-items-start">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <div className="small">
            Sau khi <strong>Gửi đánh giá</strong>, bạn có thể không chỉnh sửa được nữa (tuỳ rule backend).
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div
        className="card-footer bg-white border-0 p-3"
        style={{ position: "sticky", bottom: 0, zIndex: 5, boxShadow: "0 -6px 18px rgba(0,0,0,.06)" }}
      >
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary w-50 py-2"
            disabled={isSaving || isSubmitting}
            onClick={onSaveDraft}
          >
            <i className="bi bi-save me-2"></i>
            {isSaving ? "Đang lưu..." : "Lưu bản nháp"}
          </button>

          <button
            type="button"
            className="btn btn-primary w-50 py-2"
            disabled={isSaving || isSubmitting}
            onClick={onSubmitFinal}
          >
            <i className="bi bi-send-check me-2"></i>
            {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
          </button>
        </div>

        {lastSavedAt && (
          <div className="text-center text-muted small mt-2">
            Lần cuối lưu: {lastSavedAt}
          </div>
        )}
      </div>
    </div>
  );
}
