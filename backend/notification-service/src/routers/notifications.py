# routers/notifications.py
from fastapi import APIRouter, BackgroundTasks, Depends, status, HTTPException, Header, Query
from sqlalchemy.orm import Session
from src.models import Message
from src import database, schemas, crud, models
from src.utils import email_utils 
from typing import List
from uuid import uuid4
from src.config import settings
from src.utils.email_utils import send_email_async
from src.services.conference_client import get_conference
from src.database import get_db
from sqlalchemy import or_
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
    "/reviewer-invitations/me",
    response_model=list[schemas.ReviewerInvitationResponse],
    dependencies=[Depends(require_roles(["REVIEWER"]))],
)
def get_my_reviewer_invitations(
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    email = (payload.get("sub") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=401, detail="Token missing email (sub)")

    return (
        db.query(models.ReviewerInvitation)
        .filter(models.ReviewerInvitation.reviewer_email == email)
        .order_by(models.ReviewerInvitation.id.desc())
        .all()
    )

@router.post(
    "/reviewer-invitations/{invitation_id}/accept",
    dependencies=[Depends(require_roles(["REVIEWER"]))],
)
def accept_reviewer_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    email = (payload.get("sub") or "").lower().strip()
    inv = (
        db.query(models.ReviewerInvitation)
        .filter(models.ReviewerInvitation.id == invitation_id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if (inv.reviewer_email or "").lower().strip() != email:
        raise HTTPException(status_code=403, detail="Not your invitation")

    if inv.status != models.InvitationStatus.PENDING:
        return {"message": "Already responded", "status": inv.status}

    inv.status = models.InvitationStatus.ACCEPTED
    db.commit()
    db.refresh(inv)
    return {"message": "Accepted", "status": inv.status}


@router.post(
    "/reviewer-invitations/{invitation_id}/decline",
    dependencies=[Depends(require_roles(["REVIEWER"]))],
)
def decline_reviewer_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    email = (payload.get("sub") or "").lower().strip()
    inv = (
        db.query(models.ReviewerInvitation)
        .filter(models.ReviewerInvitation.id == invitation_id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if (inv.reviewer_email or "").lower().strip() != email:
        raise HTTPException(status_code=403, detail="Not your invitation")

    if inv.status != models.InvitationStatus.PENDING:
        return {"message": "Already responded", "status": inv.status}

    inv.status = models.InvitationStatus.DECLINED
    db.commit()
    db.refresh(inv)
    return {"message": "Declined", "status": inv.status}


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
    email = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    q = db.query(models.Message).filter(
        or_(
            models.Message.receiver_id == user_id,
            models.Message.receiver_email == email
        )
    ).order_by(models.Message.created_at.desc())

    return q.all()


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
    email = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    msg = db.query(models.Message).filter(
        models.Message.id == message_id,
        or_(
            models.Message.receiver_id == user_id,
            models.Message.receiver_email == email
        )
    ).first()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    msg.is_read = True
    db.commit()

    return {"status": "success", "is_read": True}



@router.post("/reviewer-invite")
def invite_reviewer(
    payload: schemas.ReviewerInviteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db)
):
    token = uuid4().hex

    conference = None
    if getattr(payload, "conference_id", None):
        conference = get_conference(payload.conference_id)
        if not conference:
            raise HTTPException(status_code=404, detail="Conference not found")

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
        conference_id=conference["id"] if conference else None,
        conference_name=conference["name"] if conference else None,
        reviewer_email=payload.reviewer_email,
        reviewer_name=payload.reviewer_name,
        description=(payload.description or ""),
        token=token
    )


@router.get(
    "/reviewer-invitations",
    response_model=list[schemas.ReviewerInvitationResponse],
    dependencies=[Depends(require_roles(["ADMIN", "CHAIR"]))],
)
def list_reviewer_invitations(
    db: Session = Depends(get_db),
):
    return (
        db.query(models.ReviewerInvitation)
        .order_by(models.ReviewerInvitation.id.desc())
        .all()
    )



@router.get(
    "/all",
    response_model=List[schemas.MessageResponse],
    dependencies=[Depends(require_roles(["ADMIN"]))],
)
def admin_list_all(
    db: Session = Depends(database.get_db),
):
    return db.query(crud.models.Message).order_by(crud.models.Message.created_at.desc()).all()



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


