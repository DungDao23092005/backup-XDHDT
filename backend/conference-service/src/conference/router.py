import os
import shutil
from uuid import uuid4
from datetime import time, date, datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.conference.models import Conference
from pathlib import Path
from datetime import time, date, datetime
from uuid import uuid4

from src.conference.schemas import ConferenceDeleteResult
from sqlalchemy import text
from datetime import time , date, datetime

from src.conference.schemas import (
    ConferenceCreate,
    ConferenceUpdate,
    ConferenceResponse,
    ConferenceUpdateResult
)
from fastapi import UploadFile, File, Form

import os, shutil

from src.security.deps import require_roles

# =========================
# CONFIG
# =========================
router = APIRouter(prefix="/api/conferences", tags=["Conferences"])

BASE_DIR = Path(__file__).resolve().parents[1]  # trỏ về thư mục src
STATIC_DIR = BASE_DIR / "static"
LOGO_DIR = STATIC_DIR / "conference_logos"
LOGO_DIR.mkdir(parents=True, exist_ok=True)

# =========================
# HELPER FUNCTIONS
# =========================
def save_logo(file: UploadFile) -> str:
    if not file:
        return None

    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{uuid4().hex}{ext}"
    path = LOGO_DIR / filename

    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file.file.close()  # ✅ đóng stream

    return f"/static/conference_logos/{filename}"



def get_conference_status(conference: Conference) -> str:
    now = datetime.now()
    start = conference.start_date
    end = conference.end_date

    if not start or not end:
        return "unknown"

    if not isinstance(start, datetime):
        start = datetime.combine(start, time.min)
    if not isinstance(end, datetime):
        end = datetime.combine(end, time.max)

    if now < start:
        return "upcoming"
    elif now > end:
        return "ended"
    return "ongoing"

# =========================
# [NEW] API ĐẾM SỐ LƯỢNG (Cho Service Khác Gọi)
# =========================
@router.get("/count-total")
def count_conferences(db: Session = Depends(get_db)):
    """API trả về tổng số lượng hội nghị (Dùng cho Dashboard Admin)"""
    count = db.query(Conference).count()
    return {"total": count}

# =========================
# GET ALL CONFERENCES
# =========================
@router.get("/")
def get_conferences(db: Session = Depends(get_db)):
    conferences = db.query(Conference).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "logo": c.logo,
            "start_date": c.start_date,
            "end_date": c.end_date,
            "status": get_conference_status(c),
        }
        for c in conferences
    ]

# =========================
# CREATE CONFERENCE
# =========================
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_conference(
    name: str = Form(...),
    description: str | None = Form(None),
    start_date: date = Form(...),
    start_time: time = Form(...),
    end_date: date = Form(...),
    end_time: time = Form(...),
    logo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles("ADMIN", "CHAIR")),
):
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    start_dt = datetime.combine(start_date, start_time).replace(microsecond=0)
    end_dt = datetime.combine(end_date, end_time).replace(microsecond=0)

    if start_dt >= end_dt:
        raise HTTPException(status_code=400, detail="Start time must be before end time")

    logo_path = save_logo(logo) if logo else None

    new_conference = Conference(
        name=name,
        description=description,
        logo=logo_path,
        start_date=start_dt,
        end_date=end_dt,
        created_by=user_id,
    )

    db.add(new_conference)
    db.commit()
    db.refresh(new_conference)

    return {
        "message": "Conference created successfully",
        "conference": {
            "id": new_conference.id,
            "name": new_conference.name,
            "status": get_conference_status(new_conference)
        },
    }

# =========================
# GET BY ID
# =========================
@router.get("/{conference_id}")
def get_conference_by_id(conference_id: int, db: Session = Depends(get_db)):
    conference = db.query(Conference).filter(Conference.id == conference_id).first()
    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")

    return {
        "id": conference.id,
        "name": conference.name,
        "description": conference.description,
        "logo": conference.logo,
        "start_date": conference.start_date,
        "end_date": conference.end_date,
        "status": get_conference_status(conference),
        "created_by": conference.created_by,
    }

# =========================
# UPDATE
# =========================
@router.put("/{conference_id}")
def update_conference(
    conference_id: int,
    name: str | None = Form(None),
    description: str | None = Form(None),
    start_date: date | None = Form(None),
    start_time: time | None = Form(None),
    end_date: date | None = Form(None),
    end_time: time | None = Form(None),
    logo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles("ADMIN", "CHAIR")),
):
    conference = db.query(Conference).filter(Conference.id == conference_id).first()
    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")

    if name: conference.name = name
    if description: conference.description = description

    # Cập nhật thời gian
    current_start = conference.start_date
    current_end = conference.end_date

    # Nếu truyền date/time mới thì ghép lại, nếu không thì dùng cái cũ
    new_start_dt = datetime.combine(
        start_date if start_date else current_start.date(),
        start_time if start_time else current_start.time()
    )
    
    new_end_dt = datetime.combine(
        end_date if end_date else current_end.date(),
        end_time if end_time else current_end.time()
    )

    if new_start_dt >= new_end_dt:
        raise HTTPException(status_code=400, detail="Start time must be before end time")

    conference.start_date = new_start_dt
    conference.end_date = new_end_dt

    if logo:
        conference.logo = save_logo(logo)

    db.commit()
    db.refresh(conference)

    return {"message": "Conference updated successfully", "id": conference.id}

# =========================
# DELETE
# =========================
@router.delete("/{conference_id}")
def delete_conference(
    conference_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles("ADMIN", "CHAIR")),
):
    conference = db.query(Conference).filter(Conference.id == conference_id).first()
    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")

    db.delete(conference)
    db.commit()

    return {"message": "Conference deleted successfully", "id": conference_id}