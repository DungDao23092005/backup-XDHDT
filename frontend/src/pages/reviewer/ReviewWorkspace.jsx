// src/pages/reviewer/ReviewWorkspace.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../../api/axiosClient"; 
import reviewApi from "../../api/reviewApi";
import ReviewForm from "./ReviewForm";
import ReviewDiscussion from "./ReviewDiscussion";

// --- COMPONENT AI ANALYSIS ---
const AIAnalysisSection = ({ paperId }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAIAnalysis = async () => {
    if (!paperId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get(`/intelligent/papers/${paperId}/analyze`);
      setAnalysis(res.data || res); 
    } catch (err) {
      console.error("AI Error:", err);
      let msg = "Không thể phân tích bài báo này.";
      if (err.response?.status === 404) msg = "AI chưa tìm thấy dữ liệu bài báo này.";
      if (err.response?.status === 401) msg = "Phiên đăng nhập hết hạn. Hãy F5 hoặc đăng nhập lại.";
      if (err.response?.status === 500) msg = "Lỗi hệ thống AI. Vui lòng thử lại sau.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden mb-6 animate-in fade-in slide-in-from-top-2">
      <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
           <span className="material-symbols-outlined text-indigo-600">smart_toy</span> 
           AI Assistant Analysis
        </h3>
        {!analysis && !loading && (
           <button 
             onClick={fetchAIAnalysis} 
             className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1"
           >
             <span className="material-symbols-outlined text-[16px]">play_arrow</span>
             Phân tích ngay
           </button>
        )}
      </div>
      
      <div className="p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-4 text-indigo-500 gap-2">
            <span className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
            <span className="text-sm font-medium animate-pulse">Đang đọc bài báo và suy nghĩ...</span>
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
            <span className="material-symbols-outlined text-lg mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}
        
        {analysis && (
          <div className="space-y-4">
             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Tóm tắt (Synopsis)</label>
                <p className="text-sm text-slate-800 leading-relaxed text-justify">
                  {analysis.synopsis}
                </p>
             </div>
             <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Ý chính (Key Points)</label>
                <ul className="space-y-2">
                  {analysis.key_points?.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 bg-white p-2 rounded border border-slate-100 shadow-sm">
                       <span className="material-symbols-outlined text-emerald-500 text-lg shrink-0">check_circle</span>
                       <span>{point}</span>
                    </li>
                  ))}
                </ul>
             </div>
          </div>
        )}

        {!analysis && !loading && !error && (
          <div className="text-center py-6 text-slate-400 text-sm bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
             Bấm nút <b>"Phân tích ngay"</b> để AI tóm tắt và đánh giá sơ bộ bài báo này giúp bạn.
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------

const ReviewWorkspace = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  // --- UI STATES ---
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("standard"); // 'standard' | 'split'
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null); // URL blob để hiển thị PDF
  const [loadingPdf, setLoadingPdf] = useState(false);

  // --- DATA STATES ---
  const [assignment, setAssignment] = useState(null);
  const [paper, setPaper] = useState(null);
  const [rebuttal, setRebuttal] = useState(null);
  const [blockedByCoi, setBlockedByCoi] = useState(false);
  // [FIX] Removed unused coiInfo state

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

  const formatTime = (date) => date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute:'2-digit' });

  const isOverdue = useMemo(() => {
    if (!assignment?.due_date) return false;
    return new Date() > new Date(assignment.due_date);
  }, [assignment]);

  // Hàm tải PDF dưới dạng Blob để xem và tải
  const fetchPdfBlob = useCallback(async (id) => {
      try {
          setLoadingPdf(true);
          const response = await reviewApi.downloadPaper(id);
          
          // Kiểm tra blob
          const blobData = response.data instanceof Blob ? response.data : response;
          if (blobData instanceof Blob) {
             const url = window.URL.createObjectURL(blobData);
             setPdfBlobUrl(url);
          }
      } catch (error) {
          console.error("Failed to load PDF blob:", error);
          toast.warning("Không thể tải trước file PDF. Vui lòng thử tải về máy.");
      } finally {
          setLoadingPdf(false);
      }
  }, []);

  // [FIX] Thêm pdfBlobUrl vào dependency
  useEffect(() => {
      if (pdfBlobUrl && window.innerWidth > 1024) {
          setViewMode("split"); // Tự động bật split view nếu tải xong
      }
  }, [pdfBlobUrl]);

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
        // setCoiInfo(null); // Removed
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
          // setCoiInfo(openCoi); // Removed
        }

        if (a.paper) {
          setPaper(a.paper);
        } else {
          setPaper({
             id: paperId,
             title: a.paper_title || a.title || `Paper #${paperId}`,
             abstract: a.paper_abstract || "Nội dung tóm tắt đang được bảo mật.",
             versions: []
          });
        }

        // --- FETCH REBUTTAL ---
        if (paperId && !openCoi) {
            try {
                const rebRes = await axiosClient.get(`/review/rebuttals/paper/${paperId}`);
                setRebuttal(rebRes.data || rebRes);
            } catch (e) {
                setRebuttal(null);
            }
            
            // Gọi hàm tải PDF blob ngay khi load xong thông tin
            fetchPdfBlob(assignmentId);
        }

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
    
    // Cleanup URL blob khi unmount
    return () => {
        if (pdfBlobUrl) window.URL.revokeObjectURL(pdfBlobUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]); // Giữ deps đơn giản để tránh re-fetch loop

  // Tính điểm
  useEffect(() => {
    const { novelty, methodology, presentation } = form.criterias;
    const score = novelty.grade * (novelty.weight || 0.4) + methodology.grade * (methodology.weight || 0.3) + presentation.grade * (presentation.weight || 0.3);
    const rounded = Math.round(score * 10) / 10;
    setForm(prev => (prev.final_score === rounded) ? prev : { ...prev, final_score: rounded });
  }, [form.criterias]);


  const validate = useCallback(() => {
    if (form.final_score <= 0) return "Vui lòng chấm điểm các tiêu chí";
    if (!form.content_author.trim()) return "Vui lòng nhập nhận xét cho tác giả";
    return null;
  }, [form]);

  // [FIX] Wrapped onSave with useCallback to use in useEffect
  const onSave = useCallback(async (isDraft = true, silent = false) => {
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
  }, [assignmentId, criteriaIdMap, form, isSubmitted, navigate, reviewId, validate]);

  // Auto Save
  // [FIX] Added dependencies
  useEffect(() => {
    if (loading || isSubmitted || isFirstLoad.current) { isFirstLoad.current = false; return; }
    const timer = setTimeout(() => { onSave(true, true); }, 2000);
    return () => clearTimeout(timer);
  }, [form, isSubmitted, loading, onSave]);

  // --- Handlers ---
  const handleCriteriaChange = (key, field, value) => {
    if (isSubmitted) return; 
    setForm((prev) => ({ ...prev, criterias: { ...prev.criterias, [key]: { ...prev.criterias[key], [field]: value } } }));
  };

  const handleFieldChange = (field, value) => {
    if (isSubmitted) return; 
    setForm((prev) => ({ ...prev, [field]: value }));
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

  const downloadPdfFile = () => {
     if (pdfBlobUrl) {
         const link = document.createElement('a');
         link.href = pdfBlobUrl;
         link.setAttribute('download', `Assignment_${assignmentId}_Paper.pdf`);
         document.body.appendChild(link);
         link.click();
         link.remove();
     } else {
         fetchPdfBlob(assignmentId).then(() => {
             // Logic fetchPdfBlob sẽ set state, user cần bấm lại hoặc tự kích hoạt nếu muốn
             toast.info("Đang tải file...");
         });
     }
  };

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
                   disabled={!pdfBlobUrl}
                   title={!pdfBlobUrl ? "Đang tải file PDF..." : "Vừa đọc vừa chấm"}
                >
                   {loadingPdf ? <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-1"></span> : <span className="material-symbols-outlined text-sm">vertical_split</span>}
                   Split View
                </button>
             </div>

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

      {viewMode === "split" && pdfBlobUrl ? (
        <div className="flex flex-1 overflow-hidden">
           <div className="w-1/2 h-full border-r border-slate-200 bg-slate-50 flex flex-col items-center justify-center">
              <object 
                 data={`${pdfBlobUrl}#view=FitH&toolbar=0`} 
                 type="application/pdf" 
                 className="w-full h-full"
                 width="100%"
                 height="100%"
              >
                 <div className="text-center p-6">
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">picture_as_pdf</span>
                    <p className="text-slate-500 mb-4">Trình duyệt không hỗ trợ xem trực tiếp.</p>
                    <button onClick={downloadPdfFile} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90">
                       Tải file về máy
                    </button>
                 </div>
              </object>
           </div>

           <div className="w-1/2 h-full overflow-y-auto bg-[#f8f9fa] p-6 custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-6">
                 <AIAnalysisSection paperId={paper?.id} />

                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="font-bold text-slate-800 text-sm">Thảo luận</h3>
                       <Link to={`/reviewer/discussion/${paper?.id}`} className="text-xs font-bold text-primary hover:underline">Mở rộng</Link>
                    </div>
                    <div className="h-40 overflow-y-auto p-2 custom-scrollbar">
                       {paper?.id && <ReviewDiscussion paperId={paper.id} compact={true} />}
                    </div>
                 </div>

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
                    {pdfBlobUrl ? (
                      <div className="pt-2">
                          <button onClick={() => window.open(pdfBlobUrl, '_blank')} className="flex items-center justify-center gap-2 w-full py-2.5 border border-primary/20 bg-primary/5 text-primary font-bold rounded-xl hover:bg-primary/10">
                            <span className="material-symbols-outlined">open_in_new</span> Mở PDF tab mới
                          </button>
                      </div>
                    ) : (
                       <div className="pt-2 text-center text-xs text-slate-400">
                          {loadingPdf ? "Đang tải PDF..." : "Không có file PDF"}
                       </div>
                    )}
                  </div>
              </div>

              <AIAnalysisSection paperId={paper?.id} />
              
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