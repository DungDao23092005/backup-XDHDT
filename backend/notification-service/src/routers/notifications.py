# routers/notifications.py
from fastapi import APIRouter, BackgroundTasks, Depends, status, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from .. import database, schemas, crud
from ..utils import email_utils
from ..security.deps import get_current_payload  # vẫn dùng cho /me

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

INTERNAL_KEY = os.getenv("INTERNAL_KEY", "")

@router.post("", status_code=status.HTTP_201_CREATED)
def send_notification(
    req: schemas.NotificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    x_internal_key: Optional[str] = Header(default=None, alias="X-Internal-Key"),
):
    if not INTERNAL_KEY or x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Invalid internal key")

    # sender_id với internal-call có thể để 0 hoặc None tuỳ DB bạn thiết kế
    sender_id = 0

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


@router.get("/me", response_model=List[schemas.MessageResponse])
def get_my_inbox(
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")
    return crud.get_user_messages(db=db, user_id=user_id)


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
