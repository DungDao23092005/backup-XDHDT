import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios"; // Dùng để gọi API Rebuttal
import reviewApi from "../../api/reviewApi";
import ReviewForm from "./ReviewForm";
import ReviewDiscussion from "./ReviewDiscussion";

const ReviewWorkspace = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  // --- UI STATES ---
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("standard"); // 'standard' | 'split'

  // --- DATA STATES ---
  const [assignment, setAssignment] = useState(null);
  const [paper, setPaper] = useState(null);
  const [rebuttal, setRebuttal] = useState(null); // <--- State lưu phản biện
  const [blockedByCoi, setBlockedByCoi] = useState(false);
  const [coiInfo, setCoiInfo] = useState(null);

  // --- REVIEW STATES ---
  const [reviewId, setReviewId] = useState(null);
  const [criteriaIdMap, setCriteriaIdMap] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // --- AUTO SAVE STATES ---
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState(null);
  const isFirstLoad = useRef(true); 
  const [saving, setSaving] = useState(false);

  // --- FORM STATE ---
  const [form, setForm] = useState({
    final_score: 0,
    confidence_score: 3,
    content_author: "",
    content_pc: "",
    is_anonymous: true,
    is_draft: true,
    criterias: {
      novelty: { grade: 0, comment: "", weight: 0.4 },
      methodology: { grade: 0, comment: "", weight: 0.3 },
      presentation: { grade: 0, comment: "", weight: 0.3 },
    },
  });

  // Helper hiển thị thời gian
  const formatTime = (date) => date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute:'2-digit' });

  // Tính toán Deadline
  const isOverdue = useMemo(() => {
    if (!assignment?.due_date) return false;
    return new Date() > new Date(assignment.due_date);
  }, [assignment]);

  // Lấy URL PDF
  const pdfUrl = useMemo(() => {
      if (paper?.versions && paper.versions.length > 0) {
          return paper.versions[0].file_url;
      }
      return null;
  }, [paper]);

  // Tự động chuyển sang Split View nếu có PDF và màn hình lớn
  useEffect(() => {
    if (pdfUrl && window.innerWidth > 1024) {
        setViewMode("split");
    }
  }, [pdfUrl]);

  useEffect(() => {
    const ensureAssignmentAccepted = async (a) => {
      const st = (a?.status?.value ?? a?.status ?? "").toString().toLowerCase();
      if (st === "invited") {
        await reviewApi.acceptAssignment(a.id);
        const refreshed = await reviewApi.getAssignment(a.id);
        return refreshed.data || refreshed;
      }
      return a;
    };

    const checkOpenCoiForPaper = async (paperId) => {
      if (!paperId) return null;
      try {
        const res = await reviewApi.listCOI({ paper_id: Number(paperId) });
        const list = Array.isArray(res) ? res : (res.data || []);
        const open = list.find((c) => (c.status?.value ?? c.status ?? "").toString().toLowerCase() === "open");
        return open || null;
      } catch (e) { return null; }
    };

    const fetchData = async () => {
      try {
        setLoading(true);
        setBlockedByCoi(false);
        setCoiInfo(null);
        setIsSubmitted(false);
        setRebuttal(null);

        // 1. Get Assignment
        const assignmentRes = await reviewApi.getAssignment(assignmentId);
        let a = assignmentRes?.data || assignmentRes;
        if (!a || !a.id) throw new Error(`Không tìm thấy assignment #${assignmentId}`);

        try { a = await ensureAssignmentAccepted(a); } 
        catch (e) { toast.error("Không thể accept assignment: " + e.message); }
        setAssignment(a);

        // 2. Get Paper Info
        const paperId = a.paper_id ?? a.paperId ?? a.paper?.id;
        const openCoi = await checkOpenCoiForPaper(paperId);
        if (openCoi) {
          setBlockedByCoi(true);
          setCoiInfo(openCoi);
        }

        if (a.paper) {
          setPaper(a.paper);
        } else {
          // Fallback fetch PDF URL
          let url = "";
          try {
             const pdfRes = await reviewApi.getPaperPdfUrlByAssignment(assignmentId);
             url = (pdfRes.data || pdfRes).pdf_url || "";
          } catch(ignore) {}

          setPaper({
             id: paperId,
             title: a.paper_title || a.title || `Paper #${paperId}`,
             abstract: a.paper_abstract || "Nội dung tóm tắt đang được bảo mật.",
             versions: url ? [{ file_url: url }] : []
          });
        }

        // --- 👇 LẤY REBUTTAL (PHẢN BIỆN CỦA TÁC GIẢ) 👇 ---
        if (paperId && !openCoi) {
            try {
                // Gọi trực tiếp axios vì chưa có trong reviewApi
                const token = localStorage.getItem("token");
                const rebRes = await axios.get(`http://localhost:8080/review/rebuttals/paper/${paperId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRebuttal(rebRes.data);
            } catch (e) {
                // 404 nghĩa là chưa có rebuttal -> Không làm gì cả
                setRebuttal(null);
            }
        }
        // --------------------------------------------------

        if (openCoi) return; 

        // 3. Get Review
        const reviewsRes = await reviewApi.listReviews({ assignmentId: Number(assignmentId) });
        const reviews = Array.isArray(reviewsRes) ? reviewsRes : (reviewsRes.data || []);

        if (reviews.length > 0) {
          const r0 = reviews[0];
          setReviewId(r0.id);
          const rDetailRes = await reviewApi.getReview(r0.id);
          const r = rDetailRes.data || rDetailRes;

          const submitted = r.is_draft === false || r.submitted_at != null;
          setIsSubmitted(submitted);

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
              novelty: { ...prev.criterias.novelty, grade: findById(map.novelty)?.grade ?? 0, comment: findById(map.novelty)?.comment ?? "" },
              methodology: { ...prev.criterias.methodology, grade: findById(map.methodology)?.grade ?? 0, comment: findById(map.methodology)?.comment ?? "" },
              presentation: { ...prev.criterias.presentation, grade: findById(map.presentation)?.grade ?? 0, comment: findById(map.presentation)?.comment ?? "" },
            },
          }));
        }
      } catch (error) {
        toast.error("Lỗi tải trang: " + (error.message || "Unknown"));
      } finally {
        setLoading(false);
      }
    };
    if (assignmentId) fetchData();
  }, [assignmentId]);

  // Tính điểm
  useEffect(() => {
    const { novelty, methodology, presentation } = form.criterias;
    const score = novelty.grade * (novelty.weight || 0.4) + methodology.grade * (methodology.weight || 0.3) + presentation.grade * (presentation.weight || 0.3);
    const rounded = Math.round(score * 10) / 10;
    setForm(prev => (prev.final_score === rounded) ? prev : { ...prev, final_score: rounded });
  }, [form.criterias]);

  // Auto Save
  useEffect(() => {
    if (loading || isSubmitted || isFirstLoad.current) { isFirstLoad.current = false; return; }
    const timer = setTimeout(() => { onSave(true, true); }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // --- Handlers ---
  const handleCriteriaChange = (key, field, value) => {
    if (isSubmitted) return; 
    setForm((prev) => ({ ...prev, criterias: { ...prev.criterias, [key]: { ...prev.criterias[key], [field]: value } } }));
  };

  const handleFieldChange = (field, value) => {
    if (isSubmitted) return; 
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (form.final_score <= 0) return "Vui lòng chấm điểm các tiêu chí";
    if (!form.content_author.trim()) return "Vui lòng nhập nhận xét cho tác giả";
    return null;
  };

  const handleReopen = async () => {
    if (!window.confirm("Bạn muốn chỉnh sửa lại kết quả đánh giá? Bài chấm sẽ chuyển về trạng thái NHÁP.")) return;
    setSaving(true);
    try {
        await reviewApi.updateReview(reviewId, { is_draft: true });
        setIsSubmitted(false); 
        toast.success("Đã mở lại bài chấm (Chế độ Nháp)");
        setForm(prev => ({ ...prev, is_draft: true }));
    } catch (e) {
        toast.error("Không thể mở lại bài chấm: " + (e?.response?.data?.detail || e.message));
    } finally {
        setSaving(false);
    }
  };

  const onSave = async (isDraft = true, silent = false) => {
    if (isSubmitted && !silent) { toast.info("Bài đã nộp. Vui lòng bấm 'Chỉnh sửa lại'."); return; }
    const err = (!isDraft && !silent) ? validate() : null;
    if (err) { toast.warning(err); return; }

    if (silent) setIsAutoSaving(true); else setSaving(true);

    try {
      let currentReviewId = reviewId;
      if (!currentReviewId) {
        const createRes = await reviewApi.createReview({
          assignment_id: Number(assignmentId),
          final_score: form.final_score,
          confidence_score: Number(form.confidence_score),
          content_author: form.content_author,
          content_pc: form.content_pc,
          is_anonymous: form.is_anonymous,
          is_draft: true,
        });
        const newReview = createRes.data || createRes;
        currentReviewId = newReview.id;
        setReviewId(currentReviewId);
      } else {
        await reviewApi.updateReview(currentReviewId, {
          final_score: form.final_score,
          confidence_score: Number(form.confidence_score),
          content_author: form.content_author,
          content_pc: form.content_pc,
          is_anonymous: form.is_anonymous,
          is_draft: true, 
        });
      }

      const promises = Object.keys(form.criterias).map(async (key) => {
        const cData = form.criterias[key];
        const criteriaNameMap = { novelty: "Novelty & Significance", methodology: "Methodology & Technical Depth", presentation: "Presentation & Clarity" };
        const payload = { grade: Number(cData.grade), comment: cData.comment, weight: cData.weight };
        const existingId = criteriaIdMap[key];
        
        if (existingId) return reviewApi.updateCriteria(currentReviewId, existingId, payload);
        else {
           const res = await reviewApi.addCriteria(currentReviewId, { ...payload, criteria_name: criteriaNameMap[key] });
           const created = res.data || res;
           setCriteriaIdMap(prev => ({ ...prev, [key]: created.id }));
           return created;
        }
      });
      await Promise.all(promises);

      if (!isDraft) {
        await reviewApi.submitReview(currentReviewId);
        toast.success("Đã nộp bài review thành công!");
        setIsSubmitted(true);
        navigate("/reviewer/assignments");
      } else {
        if (!silent) toast.success("Đã lưu bản nháp (" + formatTime(new Date()) + ")");
        if (silent) setLastAutoSaved(new Date());
      }
    } catch (e) {
      if (!silent) toast.error("Lỗi: " + (e?.response?.data?.detail || e.message));
    } finally {
      if (silent) setIsAutoSaving(false); else setSaving(false);
    }
  };

  // --- Sub-component: REBUTTAL DISPLAY ---
  const RebuttalSection = () => {
      if (!rebuttal) return null;
      return (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-purple-700">rate_review</span>
                <h3 className="font-bold text-purple-900 text-sm uppercase tracking-wider">
                    Phản hồi từ tác giả (Author's Rebuttal)
                </h3>
                <span className="text-xs text-purple-500 ml-auto">
                    Gửi lúc: {new Date(rebuttal.created_at).toLocaleString("vi-VN")}
                </span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-purple-100 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm max-h-60 overflow-y-auto custom-scrollbar">
                {rebuttal.content}
            </div>
            <div className="mt-2 text-xs text-purple-600 font-medium italic flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">info</span>
                Hãy xem xét lại điểm số của bạn dựa trên giải trình này (nếu hợp lý).
            </div>
        </div>
      );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium animate-pulse">Đang tải workspace...</div>;
  if (blockedByCoi) return <div className="min-h-screen flex items-center justify-center p-4">Bạn đã khai báo COI.</div>;

  return (
    <div className="bg-[#f8f9fa] h-screen flex flex-col overflow-hidden">
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-200 shrink-0 z-20 shadow-sm h-16 flex items-center px-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => navigate("/reviewer/assignments")} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="min-w-0">
               <h1 className="text-lg font-black text-slate-900 truncate max-w-md" title={paper?.title}>{paper?.title || `Paper #${paper?.id}`}</h1>
               <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
                 {isAutoSaving ? <span className="text-slate-500 animate-pulse">Đang lưu...</span> : lastAutoSaved ? <span className="text-emerald-600">Đã lưu tự động {formatTime(lastAutoSaved)}</span> : <span>Sẵn sàng</span>}
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Toggle View Mode Button */}
             <div className="hidden lg:flex bg-slate-100 rounded-lg p-1 mr-2 border border-slate-200">
                <button 
                   onClick={() => setViewMode("standard")}
                   className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'standard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   <span className="material-symbols-outlined text-sm">view_agenda</span>
                   Standard
                </button>
                <button 
                   onClick={() => setViewMode("split")}
                   className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'split' ? 'bg-white text-[#1976d2] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   disabled={!pdfUrl}
                   title={!pdfUrl ? "Không có file PDF để xem" : "Vừa đọc vừa chấm"}
                >
                   <span className="material-symbols-outlined text-sm">vertical_split</span>
                   Split View
                </button>
             </div>

             {/* Action Buttons */}
             {!isSubmitted ? (
                <>
                  <button disabled={saving} onClick={() => onSave(true, false)} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50">
                    <span className="material-symbols-outlined text-xl">save</span> Lưu nháp
                  </button>
                  <button disabled={saving} onClick={() => onSave(false, false)} className="flex items-center gap-2 px-5 py-2 bg-primary text-white font-bold rounded-lg hover:shadow-lg disabled:opacity-50">
                    {saving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined text-xl">send</span>}
                    Nộp bài
                  </button>
                </>
             ) : (
                !isOverdue ? (
                   <button disabled={saving} onClick={handleReopen} className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-200 text-amber-700 font-bold rounded-lg hover:bg-amber-50 shadow-sm">
                      <span className="material-symbols-outlined text-xl">edit</span> Chỉnh sửa lại
                   </button>
                ) : (
                   <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 cursor-not-allowed select-none">
                      <span className="material-symbols-outlined text-xl">check_circle</span> Đã nộp
                   </div>
                )
             )}
          </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      {viewMode === "split" && pdfUrl ? (
        // === SPLIT VIEW LAYOUT ===
        <div className="flex flex-1 overflow-hidden">
           {/* LEFT: PDF Viewer */}
           <div className="w-1/2 h-full border-r border-slate-200 bg-slate-50 flex flex-col items-center justify-center">
              {/* Dùng thẻ object để ép hiển thị PDF */}
              <object 
                 data={`${pdfUrl}#view=FitH&toolbar=0`} 
                 type="application/pdf" 
                 className="w-full h-full"
                 width="100%"
                 height="100%"
              >
                 <div className="text-center p-6">
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">picture_as_pdf</span>
                    <p className="text-slate-500 mb-4">Trình duyệt không hỗ trợ xem trực tiếp.</p>
                    <a href={pdfUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90">
                       Tải file về máy
                    </a>
                 </div>
              </object>
           </div>

           {/* RIGHT: Grading Form */}
           <div className="w-1/2 h-full overflow-y-auto bg-[#f8f9fa] p-6 custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-6">
                 {/* Discussion Mini-view */}
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="font-bold text-slate-800 text-sm">Thảo luận</h3>
                       <Link to={`/reviewer/discussion/${paper?.id}`} className="text-xs font-bold text-primary hover:underline">Mở rộng</Link>
                    </div>
                    <div className="h-40 overflow-y-auto p-2 custom-scrollbar">
                       {paper?.id && <ReviewDiscussion paperId={paper.id} compact={true} />}
                    </div>
                 </div>

                 {/* REBUTTAL SECTION */}
                 <RebuttalSection />

                 <ReviewForm form={form} onCriteriaChange={handleCriteriaChange} onFieldChange={handleFieldChange} />
                 
                 {isSubmitted && !isOverdue && (
                   <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                      Bạn có thể chỉnh sửa bài đánh giá này vì chưa đến hạn chót.
                   </div>
                 )}
              </div>
           </div>
        </div>
      ) : (
        // === STANDARD VIEW LAYOUT (Cũ) ===
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full overflow-y-auto h-full pb-20 custom-scrollbar">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">article</span> Thông tin bài báo
                  </h2>
                  <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Tiêu đề</label>
                        <p className="text-sm font-semibold text-slate-800 leading-snug mt-1">{paper?.title}</p>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Tóm tắt</label>
                        <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                          {paper?.abstract || "Không có nội dung."}
                        </div>
                    </div>
                    {pdfUrl && (
                      <div className="pt-2">
                          <a href={pdfUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 border border-primary/20 bg-primary/5 text-primary font-bold rounded-xl hover:bg-primary/10">
                            <span className="material-symbols-outlined">open_in_new</span> Mở PDF tab mới
                          </a>
                      </div>
                    )}
                  </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Thảo luận</h3>
                    <Link to={`/reviewer/discussion/${paper?.id}`} className="text-xs font-bold text-primary hover:underline">Mở rộng</Link>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                    {paper?.id && <ReviewDiscussion paperId={paper.id} compact={true} />}
                  </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              {/* REBUTTAL SECTION */}
              <RebuttalSection />

              <ReviewForm form={form} onCriteriaChange={handleCriteriaChange} onFieldChange={handleFieldChange} />
              
              {isSubmitted && !isOverdue && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                   Bạn có thể chỉnh sửa bài đánh giá này vì chưa đến hạn chót.
                </div>
              )}
            </div>
        </div>
      )}
    </div>
  );
};

export default ReviewWorkspace;