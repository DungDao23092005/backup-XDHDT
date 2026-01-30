import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import reviewApi from "../../api/reviewApi";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import axios from "axios"; // Dùng để gọi API extension

export default function AssignmentDetail() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- UI STATE ---
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [downloading, setDownloading] = useState(false); // Trạng thái tải file
  
  // --- DATA STATE ---
  const [assignment, setAssignment] = useState(null);
  const [review, setReview] = useState(null);
  const [paperTitle, setPaperTitle] = useState("");

  // --- EXTENSION STATE (Xin gia hạn) ---
  const [showExtModal, setShowExtModal] = useState(false);
  const [extDate, setExtDate] = useState("");
  const [extReason, setExtReason] = useState("");
  const [requesting, setRequesting] = useState(false);

  // --- 1. LOAD DATA ---
  const load = async () => {
    if (!user) return;

    setLoading(true);
    setErr("");
    try {
      const [assRes, revRes] = await Promise.all([
        reviewApi.getAssignment(Number(assignmentId)),
        reviewApi.listReviews({ assignmentId: Number(assignmentId) }),
      ]);

      const aData = assRes.data || assRes;
      setAssignment(aData);

      // Lấy Title bài báo (Logic fallback)
      if (aData.paper_title || aData.title) {
        setPaperTitle(aData.paper_title || aData.title);
      } else {
        try {
          const listRes = await reviewApi.listAssignments({ reviewerId: user.id });
          const list = Array.isArray(listRes) ? listRes : (listRes?.data || []);
          const found = list.find((item) => item.id === Number(assignmentId));
          setPaperTitle(found ? (found.paper_title || found.title) : `Paper #${aData.paper_id}`);
        } catch (ignore) {
          setPaperTitle(`Paper #${aData.paper_id}`);
        }
      }

      const reviews = Array.isArray(revRes) ? revRes : (revRes?.data || []);
      setReview(reviews[0] || null);

    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Không tải được chi tiết");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, user]);

  // --- 2. COMPUTED ---
  const submitted = useMemo(() => {
    if (!review) return false;
    return review.is_draft === false || review.submitted_at != null;
  }, [review]);

  // Tính số ngày còn lại
  const deadlineInfo = useMemo(() => {
    if (!assignment?.due_date) return null;
    const now = new Date();
    const due = new Date(assignment.due_date);
    const diffTime = due - now;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    return {
        dateStr: due.toLocaleDateString("vi-VN"),
        days,
        isOverdue: days < 0
    };
  }, [assignment]);

  // --- 3. HANDLER: XIN GIA HẠN ---
  const handleRequestExtension = async () => {
    if (!extDate || !extReason.trim()) {
        toast.warning("Vui lòng chọn ngày mới và nhập lý do.");
        return;
    }
    
    setRequesting(true);
    try {
        // LƯU Ý: Cổng port API phải khớp với backend của bạn (thường là 8000 hoặc 8080)
        // Đây là gọi trực tiếp axios vì chưa thêm vào reviewApi
        const token = localStorage.getItem("token"); // Hoặc lấy từ user context
        // TODO: Nên chuyển API này vào reviewApi.js để quản lý tập trung
        await axios.post("http://localhost:8080/review/extensions/", {
            assignment_id: Number(assignmentId),
            requested_date: new Date(extDate).toISOString(),
            reason: extReason
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        toast.success("Đã gửi yêu cầu gia hạn! Vui lòng chờ Chair phê duyệt.");
        setShowExtModal(false);
        setExtDate("");
        setExtReason("");
    } catch (e) {
        console.error(e);
        toast.error("Gửi yêu cầu thất bại: " + (e.response?.data?.detail || e.message));
    } finally {
        setRequesting(false);
    }
  };

  // --- 4. HANDLER: TẢI PDF (MỚI) ---
  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const response = await reviewApi.downloadPaper(assignmentId);
      
      // Tạo URL tạm từ blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Đặt tên file
      const filename = `Assignment_${assignmentId}_Paper.pdf`;
      link.setAttribute('download', filename); 
      
      document.body.appendChild(link);
      link.click();
      
      // Dọn dẹp
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Tải file thành công!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Không thể tải file PDF. Vui lòng thử lại sau.");
    } finally {
      setDownloading(false);
    }
  };

  // --- RENDER ---
  if (loading) return <div className="py-10 text-center text-sm text-slate-500 animate-pulse">Đang tải dữ liệu...</div>;

  return (
    <div className="max-w-5xl mx-auto w-full p-4 relative">
      {err && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-sm font-bold text-rose-700">{err}</p>
        </div>
      )}

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
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex gap-4">
          <div
            className={`size-14 rounded-full flex items-center justify-center shrink-0 ${
              submitted ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
            }`}
          >
            <span className="material-symbols-outlined text-3xl">
              {submitted ? "task_alt" : "hourglass_empty"}
            </span>
          </div>

          <div className="flex flex-col justify-center">
            {/* Trạng thái chính */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-bold text-lg ${submitted ? "text-emerald-700" : "text-slate-800"}`}>
                Trạng thái: {submitted ? "Hoàn thành (Completed)" : "Chưa nộp"}
              </span>
              {submitted && (
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded uppercase">
                  Submitted
                </span>
              )}
            </div>

            {/* Deadline Info & Nút xin gia hạn */}
            {deadlineInfo ? (
                <div className="text-sm flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500 font-medium">
                        Hạn chót: {deadlineInfo.dateStr}
                    </span>

                    {/* NÚT XIN GIA HẠN: Chỉ hiện khi chưa nộp */}
                    {!submitted && (
                         <button 
                            onClick={() => setShowExtModal(true)}
                            className="text-[10px] font-bold text-[#1976d2] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1"
                            title="Xin dời lịch deadline"
                        >
                            <span className="material-symbols-outlined text-[12px]">calendar_add_on</span>
                            Xin gia hạn
                        </button>
                    )}
                    
                    <span className="text-slate-300">•</span>
                    
                    {/* Đếm ngược ngày */}
                    {deadlineInfo.days < 0 ? (
                        <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded text-xs">
                            Quá hạn {Math.abs(deadlineInfo.days)} ngày
                        </span>
                    ) : deadlineInfo.days === 0 ? (
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded text-xs">
                            Hết hạn hôm nay
                        </span>
                    ) : (
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-xs">
                            Còn {deadlineInfo.days} ngày
                        </span>
                    )}
                </div>
            ) : (
                <div className="text-sm text-slate-400 font-medium italic">Chưa có hạn chót</div>
            )}

            {submitted && review?.submitted_at && (
                <p className="text-[#4c739a] text-xs mt-1">
                  Đã gửi lúc {new Date(review.submitted_at).toLocaleString("vi-VN")}
                </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!submitted ? (
            <div className="flex gap-2">
                {/* NÚT TẢI PDF */}
                <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-lg text-sm transition-all shadow-sm disabled:opacity-70"
                >
                    {downloading ? (
                        <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    ) : (
                        <span className="material-symbols-outlined text-lg">download</span>
                    )}
                    {downloading ? "Đang tải..." : "Tải bài báo"}
                </button>

                <button
                  onClick={() => navigate(`/reviewer/review/${assignmentId}`)}
                  className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-lg text-sm transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">rate_review</span>
                  Đi tới workspace
                </button>
            </div>
          ) : (
            <div className="flex gap-2">
                {/* NÚT TẢI PDF (Khi đã nộp vẫn tải được) */}
                <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-lg text-sm transition-all shadow-sm disabled:opacity-70"
                >
                    {downloading ? (
                        <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    ) : (
                        <span className="material-symbols-outlined text-lg">download</span>
                    )}
                    {downloading ? "..." : "Tải bài báo"}
                </button>

                {/* Nút Sửa: Chỉ hiện khi chưa quá hạn */}
                {deadlineInfo && !deadlineInfo.isOverdue && (
                    <button
                        onClick={() => navigate(`/reviewer/review/${assignmentId}`)}
                        className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-5 rounded-lg text-sm transition-all shadow-sm"
                        title="Vẫn còn hạn, có thể chỉnh sửa"
                    >
                        <span className="material-symbols-outlined text-lg">edit</span>
                        Sửa bài chấm
                    </button>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Paper Info Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8 shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
              Paper #{assignment?.paper_id}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              • Assignment #{assignment?.id}
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#0d141b] mb-1">
            {paperTitle || `Paper #${assignment?.paper_id}`}
          </h3>
          <p className="text-sm text-[#4c739a]">
             Chi tiết bài báo cần được bảo mật.
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

      {/* --- MODAL XIN GIA HẠN --- */}
      {showExtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden scale-100">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">calendar_clock</span>
                        Xin gia hạn deadline
                    </h3>
                    <button onClick={() => setShowExtModal(false)} className="text-slate-400 hover:text-rose-500">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ngày mong muốn gia hạn đến</label>
                        <input 
                            type="date" 
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none text-slate-700 font-medium"
                            value={extDate}
                            onChange={(e) => setExtDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]} // Không cho chọn ngày quá khứ
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lý do gia hạn</label>
                        <textarea 
                            rows={3}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none text-sm"
                            placeholder="VD: Tôi cần thêm thời gian để kiểm chứng dataset..."
                            value={extReason}
                            onChange={(e) => setExtReason(e.target.value)}
                        />
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 border border-blue-100 flex gap-2">
                        <span className="material-symbols-outlined text-base">info</span>
                        <div>
                           <span className="font-bold">Lưu ý:</span> Yêu cầu sẽ được gửi tới Chair. Deadline chỉ thay đổi sau khi Chair phê duyệt.
                        </div>
                    </div>
                </div>
                <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button 
                        onClick={() => setShowExtModal(false)}
                        className="px-4 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleRequestExtension}
                        disabled={requesting}
                        className="px-5 py-2 rounded-lg font-bold text-white bg-[#1976d2] hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-200 transition"
                    >
                        {requesting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined text-lg">send</span>}
                        Gửi yêu cầu
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}