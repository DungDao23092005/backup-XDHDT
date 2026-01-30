# src/routers/prefs.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import NotificationPrefs
from ..security.deps import get_current_user, CurrentUser

router = APIRouter(prefix="/api/notifications/prefs", tags=["prefs"])

class PrefsOut(BaseModel):
    deadlineReminder: bool = True

class PrefsIn(BaseModel):
    deadlineReminder: bool

@router.get("/me", response_model=PrefsOut)
def get_my_prefs(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(NotificationPrefs).filter_by(user_id=user.id).first()
    if not row:
        row = NotificationPrefs(user_id=user.id, deadline_reminder=True)
        db.add(row)
        db.commit()
        db.refresh(row)
    return PrefsOut(deadlineReminder=row.deadline_reminder)

@router.put("/me", response_model=PrefsOut)
def update_my_prefs(payload_in: PrefsIn, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(NotificationPrefs).filter_by(user_id=user.id).first()
    if not row:
        row = NotificationPrefs(user_id=user.id, deadline_reminder=True)
        db.add(row)

    row.deadline_reminder = payload_in.deadlineReminder
    db.commit()
    db.refresh(row)
    return PrefsOut(deadlineReminder=row.deadline_reminder)
