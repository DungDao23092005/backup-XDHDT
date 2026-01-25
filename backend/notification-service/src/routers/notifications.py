from fastapi import APIRouter, BackgroundTasks, Depends, status, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import database, schemas, crud
from ..utils import email_utils

# ✅ Auth deps
from ..security.deps import get_current_payload, require_roles

router = APIRouter(
    prefix="/api/notifications",   # ✅ chuẩn hóa /api
    tags=["Notifications"]
)

# =========================================================
# 1) INTERNAL: service khác gọi để tạo notification + gửi email
#    - yêu cầu JWT
#    - role cho phép: AUTHOR/REVIEWER/CHAIR/ADMIN (dễ cho đồ án)
# =========================================================
@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(["AUTHOR", "REVIEWER", "CHAIR", "ADMIN"]))],
)
def send_notification(
    req: schemas.NotificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    sender_id = payload.get("user_id") 

    saved_msg = crud.create_notification_log(db=db, msg_data=req, sender_id=sender_id)

    safe_name = req.receiver_name or "bạn"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
        <h3 style="color: #2c3e50;">Xin chào {safe_name},</h3>
        <p>Bạn có một thông báo mới từ hệ thống UTH Conference:</p>

        <div style="background-color: #f9f9f9; padding: 15px; margin: 10px 0;">
            <strong>{req.subject}</strong><br>
            <p>{req.body}</p>
        </div>

        <p>Vui lòng truy cập hệ thống để xem chi tiết.</p>
        <hr>
        <p style="font-size: 12px; color: #777;">Thông báo tự động từ Notification Service.</p>
    </div>
    """

    if getattr(req, "receiver_email", None):
        background_tasks.add_task(
            email_utils.send_email_async,
            recipient_email=req.receiver_email,
            subject=req.subject,
            html_content=html_body
        )

    return {
        "status": "queued",
        "message_id": saved_msg.id,
        "detail": "Notification saved and email task started."
    }

# =========================================================
# 2) USER: xem inbox của tôi 
# =========================================================
@router.get(
    "/me",
    response_model=List[schemas.MessageResponse],
)
def get_my_inbox(
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    return crud.get_user_messages(db=db, user_id=user_id)

# =========================================================
# 3) USER: mark read (chỉ được mark message thuộc về mình)
# =========================================================
@router.put("/{message_id}/read")
def mark_as_read(
    message_id: int,
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    msg = crud.mark_message_read(db=db, message_id=message_id, receiver_id=user_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    return {"status": "success", "is_read": True}

# =========================================================
# 4) ADMIN: xem tất cả inbox 
# =========================================================
@router.get(
    "/all",
    response_model=List[schemas.MessageResponse],
    dependencies=[Depends(require_roles(["ADMIN"]))],
)
def admin_list_all(
    db: Session = Depends(database.get_db),
):
    return db.query(crud.models.Message).order_by(crud.models.Message.created_at.desc()).all()
