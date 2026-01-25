import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import reviewApi from "../../api/reviewApi"; // Giả định bạn đã có API này
import submissionApi from "../../api/submissionApi"; // API để lấy thông tin bài báo
// Nếu chưa có api lấy AI analysis, bạn có thể gọi trực tiếp hoặc tích hợp vào submissionApi

const ReviewWorkspace = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  // State quản lý dữ liệu
  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null); // Dữ liệu AI

  // State form review
  const [reviewData, setReviewData] = useState({
    score: 0,
    confidence: 0,
    comments: "",
    confidential_comments: "", // Nhận xét kín cho Chair
  });

  // Load dữ liệu khi vào trang
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Lấy chi tiết Assignment & Paper
        const assignmentRes = await reviewApi.getAssignmentDetail(assignmentId);
        const paperData = assignmentRes.data.paper; // Giả sử cấu trúc trả về có paper
        setPaper(paperData);

        // 2. Lấy dữ liệu AI Analysis (Giả lập hoặc gọi API thực tế)
        // Nếu backend chưa trả về kèm paper, bạn cần gọi endpoint riêng của intelligent-service
        // Ví dụ: const aiRes = await intelligentApi.analyze(paperData.abstract);
        // Ở đây tôi giả lập dữ liệu để bạn thấy UI hoạt động
        const mockAI = {
          neutral_summary: "Bài báo đề xuất một kiến trúc Microservices mới sử dụng Python và AI để quản lý hội nghị. Phương pháp giúp giảm thiểu độ trễ và tăng khả năng mở rộng.",
          key_points: {
            claims: ["Tăng tốc độ xử lý 20%", "Giảm chi phí vận hành"],
            methods: ["Microservices Pattern", "Deep Learning cho NLP"],
            datasets: ["UTH-Conf Dataset 2024"]
          }
        };
        setAiAnalysis(mockAI);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Không thể tải thông tin bài báo.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assignmentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await reviewApi.submitReview(assignmentId, reviewData);
      toast.success("Đã gửi kết quả phản biện thành công!");
      navigate("/reviewer/assignments");
    } catch (error) {
      toast.error("Lỗi khi gửi phản biện.");
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div><p>Đang tải dữ liệu...</p></div>;
  if (!paper) return <div className="text-center mt-5 text-danger">Không tìm thấy bài báo.</div>;

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
        <div>
          <h4 className="mb-1 text-primary">Review Workspace</h4>
          <span className="badge bg-secondary me-2">{paper.track_name || "General Track"}</span>
          <span className="text-muted">Paper ID: #{paper.id}</span>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left"></i> Quay lại
        </button>
      </div>

      <div className="row g-4">
        {/* ================= LEFT COLUMN: PAPER INFO & AI ================= */}
        <div className="col-lg-6" style={{ height: "80vh", overflowY: "auto" }}>
          
          {/* 1. Paper Abstract Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light fw-bold">
              <i className="bi bi-file-text me-2"></i> Chi tiết bài báo
            </div>
            <div className="card-body">
              <h5 className="card-title text-dark fw-bold">{paper.title}</h5>
              {/* Double-blind: Không hiện tên tác giả nếu chế độ ẩn danh bật */}
              <p className="card-text mt-3 text-justify">{paper.abstract}</p>
              
              <div className="mt-3">
                <span className="fw-bold">Keywords: </span>
                {paper.keywords?.split(",").map((kw, idx) => (
                  <span key={idx} className="badge bg-light text-dark border me-1">{kw.trim()}</span>
                ))}
              </div>

              {paper.file_url && (
                <div className="mt-4 d-grid">
                  <a href={paper.file_url} target="_blank" rel="noreferrer" className="btn btn-outline-primary">
                    <i className="bi bi-file-pdf"></i> Xem toàn văn (PDF)
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 2. AI Assistance Card (Yêu cầu đề bài) */}
          {aiAnalysis && (
            <div className="card shadow-sm border-info mb-4">
              <div className="card-header bg-info text-white fw-bold d-flex justify-content-between">
                <span><i className="bi bi-robot me-2"></i> AI Assistant Analysis</span>
                <span className="badge bg-white text-info" style={{fontSize: "0.7em"}}>BETA</span>
              </div>
              <div className="card-body bg-light">
                {/* Neutral Summary */}
                <div className="mb-3">
                  <h6 className="fw-bold text-info">Tóm tắt trung lập (Neutral Summary):</h6>
                  <p className="small text-muted fst-italic border-start border-4 border-info ps-2">
                    "{aiAnalysis.neutral_summary}"
                  </p>
                </div>

                {/* Key Points Extraction */}
                <div className="row">
                  <div className="col-md-4">
                    <h6 className="fw-bold text-success small">Claims (Tuyên bố)</h6>
                    <ul className="small text-muted ps-3">
                      {aiAnalysis.key_points.claims.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div className="col-md-4">
                    <h6 className="fw-bold text-primary small">Methods (Phương pháp)</h6>
                    <ul className="small text-muted ps-3">
                      {aiAnalysis.key_points.methods.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                  <div className="col-md-4">
                    <h6 className="fw-bold text-warning small">Datasets</h6>
                    <ul className="small text-muted ps-3">
                      {aiAnalysis.key_points.datasets.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="card-footer text-muted small text-center">
                * AI suggestions are for reference only. Please verify with the full paper.
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: REVIEW FORM ================= */}
        <div className="col-lg-6">
          <div className="card shadow-lg border-0 h-100">
            <div className="card-header bg-primary text-white fw-bold">
              <i className="bi bi-pencil-square me-2"></i> Phiếu đánh giá (Review Form)
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                
                {/* Score Section */}
                <div className="mb-4 p-3 bg-light rounded">
                  <label className="form-label fw-bold">Điểm đánh giá (Score)</label>
                  <div className="d-flex justify-content-between px-2">
                    {[-3, -2, -1, 0, 1, 2, 3].map((s) => (
                      <div key={s} className="form-check text-center">
                        <input
                          className="form-check-input float-none"
                          type="radio"
                          name="score"
                          value={s}
                          checked={reviewData.score === s}
                          onChange={() => setReviewData({...reviewData, score: s})}
                        />
                        <div className="small fw-bold mt-1" style={{color: s < 0 ? 'red' : s > 0 ? 'green' : 'gray'}}>
                          {s}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="d-flex justify-content-between small text-muted mt-2 px-2">
                    <span>Strong Reject</span>
                    <span>Borderline</span>
                    <span>Strong Accept</span>
                  </div>
                </div>

                {/* Confidence Section */}
                <div className="mb-4">
                   <label className="form-label fw-bold">Độ tin cậy (Confidence)</label>
                   <select 
                      className="form-select"
                      value={reviewData.confidence}
                      onChange={(e) => setReviewData({...reviewData, confidence: parseInt(e.target.value)})}
                   >
                     <option value="1">1 - Thấp (Không đúng chuyên môn)</option>
                     <option value="2">2 - Trung bình</option>
                     <option value="3">3 - Cao</option>
                     <option value="4">4 - Rất cao (Chuyên gia lĩnh vực này)</option>
                   </select>
                </div>

                {/* Detailed Comments */}
                <div className="mb-3">
                  <label className="form-label fw-bold">Nhận xét chi tiết (Comments to Authors)</label>
                  <textarea
                    className="form-control"
                    rows="8"
                    placeholder="Nhập nhận xét chi tiết về điểm mạnh, điểm yếu..."
                    value={reviewData.comments}
                    onChange={(e) => setReviewData({...reviewData, comments: e.target.value})}
                    required
                  ></textarea>
                  <div className="form-text text-end">
                    Markdown supported.
                  </div>
                </div>

                {/* Confidential Comments */}
                <div className="mb-4">
                  <label className="form-label fw-bold text-danger">Nhận xét kín (Confidential to Chair)</label>
                  <textarea
                    className="form-control bg-light"
                    rows="3"
                    placeholder="Chỉ có Chair mới đọc được nội dung này (ví dụ: nghi ngờ đạo văn)..."
                    value={reviewData.confidential_comments}
                    onChange={(e) => setReviewData({...reviewData, confidential_comments: e.target.value})}
                  ></textarea>
                </div>

                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary btn-lg">
                    <i className="bi bi-send-check me-2"></i> Gửi kết quả phản biện
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewWorkspace;