# routers/notifications.py
from fastapi import APIRouter, BackgroundTasks, Depends, status, HTTPException, Header, Query
from sqlalchemy.orm import Session

from src import database, schemas, crud
from src.utils import email_utils 
from typing import List
from uuid import uuid4
from src.config import settings
from src.utils.email_utils import send_email_async
from src.services.conference_client import get_conference
from src.database import get_db

from typing import List, Optional
import os

from .. import database, schemas, crud
from ..utils import email_utils
from ..security.deps import get_current_payload  # vẫn dùng cho /me

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


router = APIRouter(
    prefix="/api/notifications",   # ✅ chuẩn hóa /api
    tags=["Notifications"]
)
INTERNAL_KEY = os.getenv("INTERNAL_KEY", "")

from ..security.deps import get_current_payload, require_roles

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(["AUTHOR", "REVIEWER", "CHAIR", "ADMIN"]))],
)

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


@router.get("/reviewer-response")
def reviewer_response(
    token: str = Query(...),
    response: str = Query(..., pattern="^(accept|decline)$"),
    db: Session = Depends(get_db)
):
    invitation = crud.get_invitation_by_token(db, token)

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status != "PENDING":
        return {"message": "Invitation already responded"}

    if response == "accept":
        invitation.status = "ACCEPTED"
    else:
        invitation.status = "DECLINED"

    db.commit()

    return {
        "message": "Response recorded successfully",
        "email": invitation.reviewer_email,
        "status": invitation.status
    }

@router.get(
    "/reviewer-invitations",
    response_model=list[schemas.ReviewerInvitationResponse]
)
def get_reviewer_invitations(db: Session = Depends(get_db)):
    """
    Get all reviewer invitations with status (PENDING / ACCEPTED / DECLINED)
    """
    return crud.get_all_reviewer_invitations(db)


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



@router.post("/reviewer-invite")
def invite_reviewer(
    payload: schemas.ReviewerInviteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db)
):
    conference = get_conference(payload.conference_id)
    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")
    token = uuid4().hex

    # ================== 📌 BƯỚC 1 GÁN Ở ĐÂY ==================
    accept_url = (
        f"http://127.0.0.1:8001/api/notifications/reviewer-response"
        f"?token={token}&response=accept"
    )

    decline_url = (
        f"http://127.0.0.1:8001/api/notifications/reviewer-response"
        f"?token={token}&response=decline"
    )

    crud.create_reviewer_invitation(
        db=db,
        conference_id=conference["id"],
        conference_name=conference["name"],
        reviewer_email=payload.reviewer_email,
        reviewer_name=payload.reviewer_name,
        description=payload.description,
        token=token
    )

    # =========================
    # LOGO URL (NẾU CÓ)
    # =========================
     # 5️⃣ LOGO URL (ONLINE – EMAIL LOAD ĐƯỢC)
    logo_url = ("https://tranhdecors.com/wp-content/uploads/2024/10/Phong-nen-hoi-nghi-sinh-vien-nghien-cuu-khoa-hoc.jpg"
    )


    html = f"""
    <div style="font-family:Arial;padding:20px;border:1px solid #ddd">

        <div style="text-align:center;margin-bottom:20px;">
            <img src="{logo_url}"
                alt="Conference Logo"
                width="480"
                style="max-width:100%; height:auto; border-radius:8px; display:block; margin:auto;" />

        </div>

        <h3 style="color:#2c3e50;">
        Kính chào {payload.reviewer_name},
    </h3>

    <p>
        {payload.description}
    </p>

    <hr>

    <h3>You are invited to review</h3>

    <p><b>Conference:</b> {conference['name']}</p>
    <p><b>Description:</b> {conference['description']}</p>

    <p><b>Start date:</b> {conference['start_date']}</p>
    <p><b>End date:</b> {conference['end_date']}</p>
    <p><b>Status:</b> {conference['status']}</p>

    <p>Please choose:</p>
    <a href="{accept_url}">Accept</a> |
    <a href="{decline_url}">Decline</a>
    """


    background_tasks.add_task(
        send_email_async,
        recipient_email=payload.reviewer_email,
        subject="Reviewer Invitation",
        html_content=html
    )

    return {"message": "Invitation sent"}




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


# =========================================================
# 5) ADMIN / CHAIR: delete reviewer invitation (DELETE THẬT)
# =========================================================
@router.delete(
    "/reviewer-invitations/{invitation_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_roles(["ADMIN", "CHAIR"]))],
)
def delete_reviewer_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
):
    deleted = crud.delete_reviewer_invitation(db, invitation_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Invitation not found")

    return {
        "message": "Reviewer invitation deleted successfully",
        "id": invitation_id
    }


