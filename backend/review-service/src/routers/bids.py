import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from src.database import get_db
from src.models import Bid, BidType
from src.schemas import BidCreate, BidResponse
from src.security.deps import get_current_user
from src.config import settings

router = APIRouter(
    prefix="/bids",
    tags=["bids"]
)

# Lấy URL của Submission Service từ biến môi trường (hoặc default)
SUBMISSION_URL = os.getenv("SUBMISSION_SERVICE_URL", "http://submission-service:8000")

@router.get("/open-papers")
async def get_papers_for_bidding(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Lấy danh sách các bài báo đang mở để Reviewer chọn (Bidding).
    """
    reviewer_id = current_user['id']
    
    # 1. Gọi Submission Service lấy tất cả bài báo (giả lập logic lấy bài public)
    # Trong thực tế, bạn sẽ gọi API: GET /submissions/open-for-bidding
    # Ở đây mình giả lập gọi lấy all, sau này bạn filter theo status='SUBMITTED' bên submission
    papers = []
    try:
        async with httpx.AsyncClient() as client:
            # Lưu ý: Bạn cần đảm bảo Submission Service có endpoint này hoặc endpoint tương tự
            # Nếu chưa có, tạm thời API này sẽ trả về rỗng hoặc lỗi nhẹ
            resp = await client.get(f"{SUBMISSION_URL}/submissions/") 
            if resp.status_code == 200:
                papers = resp.json()
    except Exception as e:
        print(f"Error calling submission service: {e}")
        # Nếu lỗi kết nối, trả về rỗng để không crash UI
        return []

    # 2. Lấy các Bid cũ của reviewer này để map vào
    my_bids = db.query(Bid).filter(Bid.reviewer_id == reviewer_id).all()
    bid_map = {b.paper_id: b.bid_type for b in my_bids}

    # 3. Ghép thông tin: Paper + Trạng thái Bid hiện tại của Reviewer
    results = []
    for p in papers:
        # Chỉ hiện các bài có trạng thái SUBMITTED (tuỳ logic của bạn)
        if p.get('status') == 'SUBMITTED': 
            # Thêm trường current_bid vào object paper
            p['current_bid'] = bid_map.get(p['id'], None)
            
            # Giả lập thêm AI summary nếu chưa có (để UI đẹp)
            if 'ai_summary' not in p:
                p['ai_summary'] = "AI generated summary placeholder..."
                
            results.append(p)
        
    return results

@router.post("/", response_model=BidResponse)
def submit_bid(
    bid_data: BidCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Reviewer gửi/cập nhật nguyện vọng chấm bài
    """
    reviewer_id = current_user['id']

    # Kiểm tra xem đã bid bài này chưa
    existing_bid = db.query(Bid).filter(
        Bid.reviewer_id == reviewer_id,
        Bid.paper_id == bid_data.paper_id
    ).first()

    if existing_bid:
        # Nếu có rồi thì update
        existing_bid.bid_type = bid_data.bid_type
        db.commit()
        db.refresh(existing_bid)
        return existing_bid
    else:
        # Nếu chưa thì tạo mới
        new_bid = Bid(
            reviewer_id=reviewer_id,
            paper_id=bid_data.paper_id,
            bid_type=bid_data.bid_type
        )
        db.add(new_bid)
        db.commit()
        db.refresh(new_bid)
        return new_bid