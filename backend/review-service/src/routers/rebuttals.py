from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from src.deps import get_db
from src.security.deps import get_current_payload, require_roles
from src import models # Nhớ cập nhật models.py thêm class Rebuttal nhé

router = APIRouter(prefix="/rebuttals", tags=["Rebuttals"])

class RebuttalOut(BaseModel):
    id: int
    paper_id: int
    content: str
    created_at: datetime
    class Config:
        orm_mode = True

# API lấy Rebuttal của một bài báo (Dành cho Reviewer/Chair xem)
@router.get("/paper/{paper_id}", response_model=RebuttalOut)
def get_rebuttal_by_paper(
    paper_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload)
):
    # Check quyền: Phải là Reviewer được gán bài này hoặc là Chair
    user_id = payload.get("user_id")
    roles = set(payload.get("roles") or [])
    
    # Nếu là Reviewer, check assignment
    if "CHAIR" not in roles and "ADMIN" not in roles:
        # Tìm xem reviewer có assignment với paper này không
        assign = db.query(models.Assignment).filter(
            models.Assignment.paper_id == paper_id,
            models.Assignment.reviewer_id == user_id
        ).first()
        if not assign:
            raise HTTPException(403, "You are not assigned to this paper")

    # Lấy Rebuttal (Giả sử 1 bài chỉ có 1 rebuttal đại diện)
    rebuttal = db.query(models.Rebuttal).filter(models.Rebuttal.paper_id == paper_id).first()
    
    if not rebuttal:
        raise HTTPException(404, "No rebuttal found for this paper")
        
    return rebuttal