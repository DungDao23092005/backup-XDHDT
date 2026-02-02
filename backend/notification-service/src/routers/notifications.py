# backend/notification-service/src/routers/notifications.py
from fastapi import APIRouter, BackgroundTasks, Depends, status, HTTPException, Header, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from uuid import uuid4
import os

# Import các module nội bộ
from src import database, schemas, crud, models
from src.utils import email_utils
from src.services.conference_client import get_conference
from src.database import get_db
from src.security.deps import get_current_payload, require_roles

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"]
)

INTERNAL_KEY = os.getenv("INTERNAL_KEY", "")

# =========================================================
# 1. API Gửi thông báo (Internal & External)
# =========================================================

@router.post("", status_code=status.HTTP_201_CREATED)
def send_notification(
    req: schemas.NotificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    x_internal_key: Optional[str] = Header(default=None, alias="X-Internal-Key"),
):
    # Check Internal Key để bảo mật nếu gọi từ service khác
    if not INTERNAL_KEY or x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Invalid internal key")

    # sender_id với internal-call có thể để 0 (System)
    sender_id = 0

    # Normalize email nếu có
    if getattr(req, "receiver_email", None):
        req.receiver_email = req.receiver_email.lower().strip()

    # 1. Lưu vào Database (để hiện lên web)
    saved_msg = crud.create_notification_log(db=db, msg_data=req, sender_id=sender_id)

    # 2. Gửi Email (nếu có địa chỉ email)
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
# 2. Xử lý Lời mời Phản biện (Reviewer Invitation)
# =========================================================

@router.post("/reviewer-invite", status_code=status.HTTP_201_CREATED)
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

    # Tạo URL phản hồi (để gửi mail nếu cần sau này)
    accept_url = (
        f"http://127.0.0.1:8001/api/notifications/reviewer-response"
        f"?token={token}&response=accept"
    )
    decline_url = (
        f"http://127.0.0.1:8001/api/notifications/reviewer-response"
        f"?token={token}&response=decline"
    )

    reviewer_email = payload.reviewer_email.lower().strip()
    reviewer_name = (payload.reviewer_name or "").strip()
    description = (payload.description or "").strip()

    # 1. Lưu lời mời vào bảng ReviewerInvitation
    inv = crud.create_reviewer_invitation(
        db=db,
        conference_id=conference["id"] if conference else None,
        conference_name=conference["name"] if conference else None,
        reviewer_email=reviewer_email,
        reviewer_name=reviewer_name,
        description=description,
        token=token
    )

    # ---------------------------------------------------------
    # [FIX] TẠO THÔNG BÁO VÀO INBOX (MESSAGE) ĐỂ HIỆN CÁI CHUÔNG
    # Không sửa schemas/models => dùng receiver_id=0 + match theo email ở /me
    # ---------------------------------------------------------
    conf_name = conference["name"] if conference else "Hội nghị"

    msg_req = schemas.NotificationRequest(
        receiver_id=0,
        receiver_email=reviewer_email,
        receiver_name=reviewer_name,
        paper_id=None,
        paper_title=conf_name,
        subject="[Lời mời] Bạn có lời mời phản biện mới",
        body=(
            f"Bạn vừa nhận được lời mời tham gia phản biện cho {conf_name}. "
            "Vui lòng vào mục 'Bài được phân công' → 'Thông báo lời mời phản biện' để xem chi tiết và phản hồi."
        )
    )
    saved_msg = crud.create_notification_log(db=db, msg_data=msg_req, sender_id=0)
    # ---------------------------------------------------------

    # (Tuỳ chọn) nếu bạn muốn gửi email ngay khi mời reviewer:
    # - hiện tại bạn chưa dùng accept_url/decline_url trong email
    # - nếu muốn, mình có thể bổ sung email HTML + button accept/decline,
    #   nhưng bạn chưa yêu cầu nên giữ nguyên.

    return {
        "message": "Invitation sent and inbox notification created",
        "invitation_id": inv.id,
        "message_id": saved_msg.id,
        "accept_url": accept_url,
        "decline_url": decline_url
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


# =========================================================
# 3. User Inbox (Hộp thư cá nhân)
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
    email = (payload.get("sub") or "").lower().strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    # Match theo UserID HOẶC Email (case-insensitive, trim)
    q = db.query(models.Message).filter(
        or_(
            models.Message.receiver_id == user_id,
            func.lower(func.trim(models.Message.receiver_email)) == email
        )
    ).order_by(models.Message.created_at.desc())

    return q.all()


@router.put("/{message_id}/read")
def mark_as_read(
    message_id: int,
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    user_id = payload.get("user_id")
    email = (payload.get("sub") or "").lower().strip()

    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    msg = db.query(models.Message).filter(
        models.Message.id == message_id,
        or_(
            models.Message.receiver_id == user_id,
            func.lower(func.trim(models.Message.receiver_email)) == email
        )
    ).first()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    msg.is_read = True
    db.commit()

    return {"status": "success", "is_read": True}


# =========================================================
# 4. Admin Management
# =========================================================

@router.get(
    "/all",
    response_model=List[schemas.MessageResponse],
    dependencies=[Depends(require_roles(["ADMIN"]))],
)
def admin_list_all(
    db: Session = Depends(database.get_db),
):
    return db.query(models.Message).order_by(models.Message.created_at.desc()).all()