import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import bidApi from "../../api/bidApi";

const PaperBidding = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load danh sách bài khi vào trang
  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const res = await bidApi.getOpenPapers();
      setPapers(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách bài báo.");
    } finally {
      setLoading(false);
    }
  };

  const handleBid = async (paperId, bidType) => {
    try {
      // 1. Gọi API gửi nguyện vọng
      await bidApi.submitBid({ paper_id: paperId, bid_type: bidType });
      
      // 2. Cập nhật giao diện ngay lập tức (Optimistic Update)
      // Tìm bài báo vừa bấm và đổi trạng thái current_bid của nó
      setPapers(papers.map(p => 
        p.id === paperId ? { ...p, current_bid: bidType } : p
      ));
      
      // 3. Thông báo
      if (bidType === "CONFLICT") {
        toast.warning("Đã báo cáo xung đột lợi ích (COI).");
      } else {
        toast.success(`Đã chọn: ${bidType}`);
      }
      
    } catch (error) {
      toast.error("Lỗi khi gửi nguyện vọng.");
    }
  };

  // Hàm helper để đổi màu nút bấm dựa trên trạng thái hiện tại
  const getBidButtonStyle = (currentBid, btnType) => {
    const isActive = currentBid === btnType;
    
    // Nếu nút đang được chọn (Active)
    if (isActive) {
        switch(btnType) {
            case 'YES': return "btn-success";      // Xanh lá
            case 'MAYBE': return "btn-warning";    // Vàng
            case 'NO': return "btn-secondary";     // Xám
            case 'CONFLICT': return "btn-danger";  // Đỏ
            default: return "btn-primary";
        }
    }
    
    // Nếu nút không được chọn (Outline)
    switch(btnType) {
        case 'YES': return "btn-outline-success";
        case 'MAYBE': return "btn-outline-warning";
        case 'NO': return "btn-outline-secondary";
        case 'CONFLICT': return "btn-outline-danger";
        default: return "btn-outline-secondary";
    }
  };

  if (loading) return (
    <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">Đang tải danh sách bài báo...</p>
    </div>
  );

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 className="mb-1 text-primary fw-bold">
                <i className="bi bi-hand-index-thumb me-2"></i> 
                Chọn bài phản biện (Paper Bidding)
            </h4>
            <p className="text-muted mb-0">
                Hãy chọn các bài báo phù hợp với chuyên môn của bạn.
            </p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={fetchPapers}>
            <i className="bi bi-arrow-clockwise me-1"></i> Làm mới
        </button>
      </div>
      
      <div className="row">
        {papers.length > 0 ? (
            papers.map((paper) => (
            <div key={paper.id} className="col-12 mb-3">
                <div className="card shadow-sm border-start border-4 border-primary h-100">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start">
                        <h5 className="card-title fw-bold text-dark mb-1">
                            {paper.title} 
                            <span className="text-muted small ms-2 fw-normal">#{paper.id}</span>
                        </h5>
                        <span className="badge bg-light text-dark border">{paper.track_name || "General Track"}</span>
                    </div>
                    
                    {/* Abstract */}
                    <p className="card-text text-secondary mt-2 mb-3 text-justify">
                        {paper.abstract}
                    </p>
                    
                    {/* AI Analysis Section (Nếu có) */}
                    {paper.ai_summary && (
                    <div className="alert alert-info bg-light border-info d-flex align-items-start p-2 mb-3">
                        <i className="bi bi-robot text-info fs-4 me-3 mt-1"></i>
                        <div>
                            <small className="fw-bold text-info text-uppercase">AI Synopsis:</small>
                            <div className="small text-muted fst-italic">{paper.ai_summary}</div>
                        </div>
                    </div>
                    )}

                    <hr className="text-muted opacity-25" />
                    
                    {/* Action Buttons */}
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="fw-bold me-2 small text-uppercase text-muted">Nguyện vọng:</span>
                        
                        <button 
                            className={`btn btn-sm ${getBidButtonStyle(paper.current_bid, 'YES')}`}
                            onClick={() => handleBid(paper.id, 'YES')}
                        >
                            <i className="bi bi-check-circle-fill me-1"></i> Muốn chấm
                        </button>

                        <button 
                            className={`btn btn-sm ${getBidButtonStyle(paper.current_bid, 'MAYBE')}`}
                            onClick={() => handleBid(paper.id, 'MAYBE')}
                        >
                            <i className="bi bi-question-circle me-1"></i> Có thể
                        </button>

                        <button 
                            className={`btn btn-sm ${getBidButtonStyle(paper.current_bid, 'NO')}`}
                            onClick={() => handleBid(paper.id, 'NO')}
                        >
                            <i className="bi bi-x-circle me-1"></i> Không muốn
                        </button>

                        <button 
                            className={`btn btn-sm ms-auto ${getBidButtonStyle(paper.current_bid, 'CONFLICT')}`}
                            onClick={() => handleBid(paper.id, 'CONFLICT')}
                        >
                            <i className="bi bi-exclamation-triangle me-1"></i> Xung đột (COI)
                        </button>
                    </div>
                </div>
                </div>
            </div>
            ))
        ) : (
            <div className="text-center text-muted mt-5 py-5 bg-light rounded border border-dashed">
                <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                <h5>Hiện chưa có bài báo nào mở để đăng ký.</h5>
                <p>Vui lòng quay lại sau khi Chair mở đợt nộp bài.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default PaperBidding;