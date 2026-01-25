from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.conference.models import Conference
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
from src.security.deps import get_current_payload, require_roles

def get_conference_status(conference):
    now = datetime.now()

    start = conference.start_date
    end = conference.end_date

    # ⛔ Chưa thiết lập thời gian
    if not start or not end:
        return "unknown"

    # nếu DB lưu DATE thì convert sang DATETIME
    if not isinstance(start, datetime):
        start = datetime.combine(start, time.min)

    if not isinstance(end, datetime):
        end = datetime.combine(end, time.max)

    if now < start:
        return "upcoming"
    elif now > end:
        return "ended"
    return "ongoing"

router = APIRouter(prefix="/conferences", tags=["Conferences"])

# =========================
# CONFIG UPLOAD
# =========================
UPLOAD_DIR = "static/conference_logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
            "status": get_conference_status(c)   # 👈 THÊM
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

    start_date: date = Form(
        ...,
        description="Start date (format: YYYY-MM-DD)"
        ),
    start_time: time = Form(
        ...,
       description="Start time (format: HH:MM:SS)" 
        ),

    end_date: date = Form(
        ...,
        description="End date (format: YYYY-MM-DD)"
        ),
    end_time: time = Form(
        ...,
        description="End time (format: HH:MM:SS)"
        ),

    logo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles("ADMIN", "CHAIR"))
):
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    start_dt = datetime.combine(start_date, start_time).replace(microsecond=0)
    end_dt = datetime.combine(end_date, end_time).replace(microsecond=0)

    if start_dt >= end_dt:
        raise HTTPException(
            status_code=400,
            detail="start datetime must be before end datetime"
        )

    # ===== Handle logo upload =====
    logo_path = None

    if logo:
        filename = f"{name}_{logo.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(logo.file, buffer)

        logo_path = file_path

    # ===== Create conference =====
    new_conference = Conference(
        name=name,
        description=description,
        logo=logo_path,
        start_date=start_dt,   # NV3
        end_date=end_dt,       # NV3
        created_by=user_id     
    )

    db.add(new_conference)
    db.commit()
    db.refresh(new_conference)

    return {
        "message": "Conference created successfully",
        "conference": {
            "id": new_conference.id,
            "name": new_conference.name,
            "description": new_conference.description,
            "logo": new_conference.logo,
            "start_date": new_conference.start_date,
            "end_date": new_conference.end_date,
            "created_by": new_conference.created_by
        }
    }

# =========================
# GET CONFERENCE BY ID
# =========================
@router.get("/{conference_id}")
def get_conference_by_id(
    conference_id: int,
    db: Session = Depends(get_db)
):
    conference = db.query(Conference).filter(
        Conference.id == conference_id
    ).first()

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
# UPDATE CONFERENCE
# =========================
@router.put("/{conference_id}", status_code=200)
def update_conference(
    conference_id: int,

    name: str | None = Form(None),
    description: str | None = Form(None),

    start_date: date | None = Form(
        None,
        description="Start date (YYYY-MM-DD)"
        ),
    start_time: time | None = Form(
        None,
        description="Start time (HH:MM:SS)"
        ),

    end_date: date | None = Form(
        None,
        description="End date (YYYY-MM-DD)"
        ),
    end_time: time | None = Form(
        None,
        description="End time (HH:MM:SS)"
        ),

    logo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles("ADMIN", "CHAIR"))
):
    conference = db.query(Conference).filter(
        Conference.id == conference_id
    ).first()

    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")

    # ===== BEFORE UPDATE =====
    old_data = {
        "id": conference.id,
        "name": conference.name,
        "description": conference.description,
        "logo": conference.logo,
        "start_date": conference.start_date,
        "end_date": conference.end_date,
    }

    # ===== UPDATE BASIC FIELDS =====
    if name is not None:
        conference.name = name

    if description is not None:
        conference.description = description

    # ===== UPDATE DATETIME (OPTIONAL) =====
    # Nếu user nhập date/time thì mới update
    if start_date or start_time:
        new_start_date = start_date or conference.start_date.date()
        new_start_time = start_time or conference.start_date.time()

        conference.start_date = (
            datetime.combine(new_start_date, new_start_time)
            .replace(microsecond=0)
        )

    if end_date or end_time:
        new_end_date = end_date or conference.end_date.date()
        new_end_time = end_time or conference.end_date.time()

        conference.end_date = (
            datetime.combine(new_end_date, new_end_time)
            .replace(microsecond=0)
        )

    # ===== VALIDATE DATETIME =====
    if conference.start_date >= conference.end_date:
        raise HTTPException(
            status_code=400,
            detail="start datetime must be before end datetime"
        )

    # ===== UPDATE LOGO =====
    if logo:
        filename = f"{conference.id}_{logo.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(logo.file, buffer)

        conference.logo = file_path

    db.commit()
    db.refresh(conference)

    # ===== AFTER UPDATE =====
    return {
        "message": "Conference updated successfully",
        "before_update": old_data,
        "after_update": {
            "id": conference.id,
            "name": conference.name,
            "description": conference.description,
            "logo": conference.logo,
            "start_date": conference.start_date,
            "end_date": conference.end_date,
        }
    }

# =========================
# DELETE CONFERENCE
# =========================
@router.delete("/{conference_id}", status_code=200)
def delete_conference(
    conference_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles("ADMIN", "CHAIR")),
):
    conference = db.query(Conference).filter(
        Conference.id == conference_id
    ).first()

    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")

    deleted_data = {
        "id": conference.id,
        "name": conference.name,
        "description": conference.description,
        "logo": conference.logo
    }

    db.delete(conference)
    db.commit()

    return {
        "message": "Conference deleted successfully",
        "deleted_conference": deleted_data
    }