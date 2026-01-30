from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import uuid4
import os
import shutil

from src.database import get_db
from src.conference.tracks.models import Track
from src.conference.tracks.schemas import TrackResponse
from src.conference.models import Conference
from src.security.deps import require_roles

router = APIRouter(prefix="/api/tracks", tags=["Tracks"])

# ====== STATIC PATH (thống nhất với app.mount("/static", StaticFiles(directory="static")) ) ======
STATIC_DIR = "static"
TRACK_LOGO_DIR = os.path.join(STATIC_DIR, "track_logos")
os.makedirs(TRACK_LOGO_DIR, exist_ok=True)

def save_track_logo(file: UploadFile) -> str:
    ext = (file.filename.split(".")[-1] if file.filename and "." in file.filename else "png")
    filename = f"{uuid4().hex}.{ext}"
    file_path = os.path.join(TRACK_LOGO_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Lưu DB theo chuẩn public URL
    return f"/static/track_logos/{filename}"


# ========================
# GET TRACKS BY CONFERENCE  ✅ đặt lên trước /{track_id}
# ========================
@router.get("/conference/{conference_id}", response_model=list[TrackResponse])
def get_tracks_by_conference(conference_id: int, db: Session = Depends(get_db)):
    return db.query(Track).filter(Track.conference_id == conference_id).all()


# ========================
# CREATE TRACK
# ========================
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_track(
    name: str = Form(...),
    description: str | None = Form(None),
    conference_id: int = Form(...),
    logo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "CHAIR")),
):
    conference = db.query(Conference).filter(Conference.id == conference_id).first()
    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")

    logo_path = save_track_logo(logo) if logo else None

    track = Track(
        name=name,
        description=description,
        conference_id=conference_id,
        logo=logo_path
    )

    try:
        db.add(track)
        db.commit()
        db.refresh(track)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid conference_id")

    return {
        "message": "Track created successfully",
        "track": {
            "id": track.id,
            "name": track.name,
            "description": track.description,
            "logo": track.logo,
            "conference_id": track.conference_id
        }
    }


# ========================
# GET ALL TRACKS
# ========================
@router.get("/", response_model=list[TrackResponse])
def get_tracks(db: Session = Depends(get_db)):
    return db.query(Track).all()


# ========================
# GET TRACK BY ID
# ========================
@router.get("/{track_id}", response_model=TrackResponse)
def get_track(track_id: int, db: Session = Depends(get_db)):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return track


# ========================
# UPDATE TRACK
# ========================
@router.put("/{track_id}")
def update_track(
    track_id: int,
    name: str | None = Form(None),
    description: str | None = Form(None),
    logo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "CHAIR")),
):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    before_update = {
        "id": track.id,
        "name": track.name,
        "description": track.description,
        "conference_id": track.conference_id,
        "logo": track.logo
    }

    if name is not None:
        track.name = name
    if description is not None:
        track.description = description
    if logo:
        track.logo = save_track_logo(logo)  # ✅ thống nhất /static/track_logos/...

    db.commit()
    db.refresh(track)

    after_update = {
        "id": track.id,
        "name": track.name,
        "description": track.description,
        "conference_id": track.conference_id,
        "logo": track.logo
    }

    return {"message": "Track updated successfully", "before": before_update, "after": after_update}


# ========================
# DELETE TRACK
# ========================
@router.delete("/{track_id}")
def delete_track(
    track_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "CHAIR"))
):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    deleted_track = {
        "id": track.id,
        "name": track.name,
        "description": track.description,
        "conference_id": track.conference_id,
        "logo": track.logo
    }

    db.delete(track)
    db.commit()
    return {"message": "Track deleted successfully", "deleted": deleted_track}
