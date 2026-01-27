from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from src.deps import get_db
from src.security.deps import get_current_payload, require_roles
# Import các model của bạn (giả sử bạn đã map model ExtensionRequest vào code)
from src import models 

router = APIRouter(prefix="/extensions", tags=["Extensions"])

# --- Schemas ---
class ExtensionCreate(BaseModel):
    assignment_id: int
    requested_date: datetime
    reason: str

class ExtensionAction(BaseModel):
    status: str # "APPROVED" hoặc "REJECTED"

# --- API cho Reviewer: Gửi yêu cầu ---
@router.post("/", dependencies=[Depends(require_roles(["REVIEWER"]))])
def request_extension(
    data: ExtensionCreate,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload)
):
    user_id = payload.get("user_id")
    
    # Check assignment ownership
    ass = db.query(models.Assignment).filter(models.Assignment.id == data.assignment_id).first()
    if not ass or ass.reviewer_id != user_id:
        raise HTTPException(403, "Not your assignment")

    # Tạo request
    new_req = models.ExtensionRequest(
        assignment_id=data.assignment_id,
        reviewer_id=user_id,
        requested_date=data.requested_date,
        reason=data.reason,
        status="PENDING"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return new_req

# --- API cho Chair: Xem danh sách yêu cầu ---
@router.get("/pending", dependencies=[Depends(require_roles(["CHAIR", "ADMIN"]))])
def list_pending_extensions(db: Session = Depends(get_db)):
    # Join để lấy thêm thông tin bài báo và reviewer cho Chair dễ nhìn
    # Lưu ý: Bạn cần config relationship trong SQLAlchemy models để query đẹp hơn
    # Ở đây mình viết query cơ bản:
    return db.query(models.ExtensionRequest).filter(models.ExtensionRequest.status == "PENDING").all()

# --- API cho Chair: Duyệt/Từ chối ---
@router.patch("/{request_id}/resolve", dependencies=[Depends(require_roles(["CHAIR", "ADMIN"]))])
def resolve_extension(
    request_id: int,
    action: ExtensionAction,
    db: Session = Depends(get_db)
):
    req = db.query(models.ExtensionRequest).filter(models.ExtensionRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    
    if req.status != "PENDING":
        raise HTTPException(400, "Request already resolved")

    if action.status == "APPROVED":
        req.status = "APPROVED"
        # LOGIC TỰ ĐỘNG TĂNG DEADLINE
        ass = db.query(models.Assignment).filter(models.Assignment.id == req.assignment_id).first()
        if ass:
            ass.due_date = req.requested_date # Cập nhật ngày mới
            db.add(ass)
            
    elif action.status == "REJECTED":
        req.status = "REJECTED"
    else:
        raise HTTPException(400, "Invalid status")

    db.commit()
    return req