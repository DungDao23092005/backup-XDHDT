import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

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
SUBMISSION_URL = os.getenv("SUBMISSION_SERVICE_URL", "http://submission-service:8000").rstrip("/")


@router.get("/open-papers")
async def get_papers_for_bidding(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lấy danh sách các bài báo đang mở để Reviewer chọn (Bidding).

    Luồng đúng:
    - Reviewer gọi review-service /bids/open-papers kèm Bearer token
    - review-service forward Authorization header sang submission-service
    - submission-service trả danh sách bài open-for-bidding (đã filter status phù hợp)
    - review-service map thêm current_bid của reviewer
    """
    reviewer_id = current_user["id"]

    # 1) Forward Authorization header (Bearer token) sang submission-service
    auth_header = request.headers.get("authorization")  # giữ nguyên "Bearer <token>"
    if not auth_header:
        # Trường hợp này thường do frontend không gửi token hoặc gateway/nginx làm mất header
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

    papers: List[Dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{SUBMISSION_URL}/submissions/open-for-bidding",
                headers={"Authorization": auth_header},
            )

        if resp.status_code != 200:
            # Log rõ ràng để debug (403/401 là phổ biến nếu endpoint chưa mở role)
            print(
                f"[Review Service] Submission open-for-bidding failed: "
                f"{resp.status_code} - {resp.text}"
            )
            # Trả rỗng để UI không crash, nhưng bạn vẫn nhìn thấy log
            return []

        papers = resp.json() or []

    except Exception as e:
        print(f"[Review Service] Error calling submission service: {e}")
        return []

    # 2) Lấy các Bid cũ của reviewer này để map vào
    my_bids = db.query(Bid).filter(Bid.reviewer_id == reviewer_id).all()
    bid_map = {b.paper_id: b.bid_type for b in my_bids}

    # 3) Ghép thông tin: Paper + trạng thái Bid hiện tại của Reviewer
    # Lưu ý: submission-service đã filter "open-for-bidding", nên về lý thuyết không cần lọc status nữa.
    results = []
    for p in papers:
        paper_id = p.get("id")
        if not paper_id:
            continue

        p["current_bid"] = bid_map.get(paper_id, None)

        # Nếu UI cần ai_summary mà backend chưa có
        if "ai_summary" not in p:
            p["ai_summary"] = "AI generated summary placeholder..."

        results.append(p)

    return results


@router.post("/", response_model=BidResponse)
def submit_bid(
    bid_data: BidCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Reviewer gửi/cập nhật nguyện vọng chấm bài
    """
    reviewer_id = current_user["id"]

    # Kiểm tra xem đã bid bài này chưa
    existing_bid = (
        db.query(Bid)
        .filter(Bid.reviewer_id == reviewer_id, Bid.paper_id == bid_data.paper_id)
        .first()
    )

    if existing_bid:
        # Nếu có rồi thì update
        existing_bid.bid_type = bid_data.bid_type
        db.commit()
        db.refresh(existing_bid)
        return existing_bid

    # Nếu chưa thì tạo mới
    new_bid = Bid(
        reviewer_id=reviewer_id,
        paper_id=bid_data.paper_id,
        bid_type=bid_data.bid_type,
    )
    db.add(new_bid)
    db.commit()
    db.refresh(new_bid)
    return new_bid
