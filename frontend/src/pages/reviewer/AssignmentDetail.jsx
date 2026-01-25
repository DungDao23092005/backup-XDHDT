import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import reviewApi from "../../api/reviewApi";

export default function AssignmentDetail() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [assignment, setAssignment] = useState(null);
  const [review, setReview] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [assRes, revRes] = await Promise.all([
        reviewApi.getAssignment(Number(assignmentId)),
        reviewApi.listReviews({ assignmentId: Number(assignmentId) }),
      ]);

      setAssignment(assRes.data);

      const reviews = revRes.data || [];
      setReview(reviews[0] || null);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Không tải được chi tiết");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [assignmentId]);

  const submitted = useMemo(() => {
    if (!review) return false;
    return review.is_draft === false || review.submitted_at != null;
  }, [review]);

  if (loading) return <div className="py-10 text-sm text-slate-500">Đang tải...</div>;

  return (
    <div className="max-w-5xl mx-auto w-full">
      {err ? (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-sm font-bold text-rose-700">{err}</p>
        </div>
      ) : null}

      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center gap-2 mb-6 text-sm">
        <span
          className="text-primary font-medium hover:underline cursor-pointer"
          onClick={() => navigate("/reviewer/assignments")}
        >
          Bài báo chấm điểm
        </span>
        <span className="material-symbols-outlined text-base text-[#4c739a]">
          chevron_right
        </span>
        <span className="text-[#4c739a] font-medium">
          Assignment #{assignment?.id} • Paper #{assignment?.paper_id}
        </span>
      </nav>

      {/* Status Panel */}
      <div
        className={`mb-8 p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          submitted
            ? "border-green-200 bg-green-50/50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex gap-4">
          <div
            className={`size-12 rounded-full flex items-center justify-center shrink-0 ${
              submitted ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-600"
            }`}
          >
            <span className="material-symbols-outlined text-3xl">
              {submitted ? "task_alt" : "hourglass_empty"}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-lg ${submitted ? "text-green-700" : "text-slate-800"}`}>
                Trạng thái: {submitted ? "Hoàn thành (Completed)" : "Chưa nộp"}
              </span>
              {submitted ? (
                <span className="px-2 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded uppercase">
                  Submitted
                </span>
              ) : null}
            </div>

            <p className="text-[#4c739a] text-sm">
              {submitted
                ? `Đã gửi lúc ${review?.submitted_at ? new Date(review.submitted_at).toLocaleString("vi-VN") : ""}`
                : "Bạn có thể tiếp tục chỉnh sửa bản nháp."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!submitted ? (
            <button
              onClick={() => navigate(`/reviewer/review/${assignmentId}`)}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-lg text-sm transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">rate_review</span>
              Đi tới workspace
            </button>
          ) : (
            <button
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-lg text-sm transition-all shadow-sm"
              onClick={() => window.print()}
            >
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              In / Xuất PDF
            </button>
          )}
        </div>
      </div>

      {/* Paper Info Card (placeholder) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
              Paper #{assignment?.paper_id}
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#0d141b] mb-1">
            (Chưa có API tiêu đề bài báo)
          </h3>
          <p className="text-sm text-[#4c739a]">
            Assignment #{assignment?.id}
          </p>
        </div>
      </div>

      {/* Review Content */}
      {submitted && review ? (
        <div className="space-y-8">
          <section>
            <h4 className="text-lg font-bold text-[#0d141b] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Chi tiết chấm điểm tiêu chí
            </h4>

            <div className="grid gap-4">
              {(review.criterias || []).map((c, idx) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h5 className="font-bold text-[#0d141b]">
                        {idx + 1}. {c.criteria_name}
                      </h5>
                      <p className="text-xs text-[#4c739a] mt-1 italic">
                        Trọng số: {c.weight ?? "—"}
                      </p>
                    </div>

                    <div className="flex flex-col items-center ml-4 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20">
                      <span className="text-2xl font-black text-primary leading-none">
                        {c.grade ?? "—"}
                      </span>
                      <span className="text-[10px] font-bold text-primary uppercase mt-1">
                        /5
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm text-[#0d141b] leading-relaxed">
                      {c.comment || "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <h5 className="font-bold text-[#0d141b] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">fact_check</span>
                  Kết luận chung
                </h5>

                <div className="text-3xl font-black text-primary">
                  Tổng điểm: {review.final_score ?? "—"}/5
                </div>

                <div className="mt-3 text-sm text-[#4c739a]">
                  Độ tự tin: <span className="font-bold text-slate-800">{review.confidence_score ?? "—"}</span>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-6 text-slate-100">
                <h5 className="font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">lock</span>
                  Nhận xét cho Ban tổ chức
                </h5>
                <p className="text-sm text-slate-400 leading-relaxed italic">
                  {review.content_pc || "—"}
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                  <span className="material-symbols-outlined text-sm">visibility_off</span>
                  Nội dung bảo mật cho BTC
                </div>
              </div>
            </div>
          </section>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h5 className="font-bold text-[#0d141b] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">forum</span>
              Nhận xét gửi tác giả
            </h5>
            <p className="text-sm text-slate-700 leading-relaxed">
              {review.content_author || "—"}
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => navigate("/reviewer/assignments")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-200 bg-white text-[#0d141b] font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Quay lại danh sách
            </button>
            <div className="flex items-center gap-2 text-[#4c739a] text-xs">
              <span className="material-symbols-outlined text-sm">info</span>
              Lần cuối xem: Hôm nay
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
          Chưa có review submitted để hiển thị.
        </div>
      )}
    </div>
  );
}
