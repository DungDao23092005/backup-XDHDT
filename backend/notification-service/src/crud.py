from sqlalchemy.orm import Session
from src import models, schemas
from src.models import ReviewerInvitation
from sqlalchemy import or_
from typing import Optional
def create_notification_log(db: Session, msg_data: schemas.NotificationRequest, sender_id: int = 0):
    new_msg = models.Message(
        sender_id=sender_id,
        receiver_id=msg_data.receiver_id,
        receiver_email=msg_data.receiver_email,
        receiver_name=msg_data.receiver_name,
        paper_id=msg_data.paper_id,
        paper_title=msg_data.paper_title,
        subject=msg_data.subject,
        body=msg_data.body,
        is_read=False,
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg


def create_email_log_entry(db: Session, email: str, subject: str):
    log_entry = models.EmailLog(
        recipient_email=email,
        subject=subject,
        status=models.EmailStatus.PENDING
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry



def update_email_log_status(db: Session, log_id: int, status: models.EmailStatus, error_msg: str = None):
    log_entry = db.query(models.EmailLog).filter(models.EmailLog.id == log_id).first()
    
    if log_entry:
        log_entry.status = status
        if error_msg:
            log_entry.error_message = error_msg
        
        db.commit()
        db.refresh(log_entry)
    
    return log_entry

def get_user_messages(db: Session, user_id: int, email: str | None = None, limit: int = 50):
    q = db.query(models.Message)

    if email:
        q = q.filter(or_(models.Message.receiver_id == user_id,
                         models.Message.receiver_email == email))
    else:
        q = q.filter(models.Message.receiver_id == user_id)

    return (
        q.order_by(models.Message.created_at.desc())
         .limit(limit)
         .all()
    )
def mark_message_read(db: Session, message_id: int, receiver_id: int, email: str | None = None):
    q = db.query(models.Message).filter(models.Message.id == message_id)

    if email:
        q = q.filter(or_(models.Message.receiver_id == receiver_id,
                         models.Message.receiver_email == email))
    else:
        q = q.filter(models.Message.receiver_id == receiver_id)

    msg = q.first()
    if msg:
        msg.is_read = True
        db.commit()
        db.refresh(msg)
    return msg


def create_reviewer_invitation(
    db: Session,
    conference_id: int | None,
    conference_name: str | None,
    reviewer_name: str,
    description: str,
    reviewer_email: str,
    token: str,
):
    invitation = ReviewerInvitation(
        conference_id=conference_id,
        conference_name=conference_name,
        reviewer_name=reviewer_name,
        description=description,
        reviewer_email=reviewer_email,
        status="PENDING",
        token=token
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


def update_invitation_status(db, token, status):
    invitation = db.query(ReviewerInvitation).filter_by(token=token).first()
    if not invitation:
        return None
    invitation.status = status
    db.commit()
    return invitation

def get_all_reviewer_invitations(db: Session):
    return db.query(ReviewerInvitation).order_by(
        ReviewerInvitation.id.desc()
    ).all()

def get_invitation_by_token(db: Session, token: str):
    return (
        db.query(ReviewerInvitation)
        .filter(ReviewerInvitation.token == token)
        .first()
    )

def delete_reviewer_invitation(db: Session, invitation_id: int) -> bool:
    invitation = (
        db.query(ReviewerInvitation)
        .filter(ReviewerInvitation.id == invitation_id)
        .first()
    )

    if not invitation:
        return False

    db.delete(invitation)
    db.commit()
    return True