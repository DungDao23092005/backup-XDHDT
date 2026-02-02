from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File, status
from sqlalchemy.orm import Session
from datetime import datetime
from src.database import get_db
from src.conference.topics.models import Topic
from src.conference.topics.schemas import (
    TopicCreate, TopicUpdate, TopicResponse
)
from src.conference.models import Conference
from src.conference.tracks.models import Track
from fastapi import UploadFile, File, Form
from src.security.deps import require_roles
import os
import shutil

router = APIRouter(
    prefix="/api/topics", tags=["Topics"]
)

# ========================
# CREATE TOPIC
# ========================
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_topic(
    name: str = Form(...),
    description: str = Form(None),
    track_id: int = Form(...),
    picture: UploadFile = File(None),
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "CHAIR")),
):
    # ========================
    # CHECK TRACK TỒN TẠI
    # ========================
    track = db.query(Track).filter(
        Track.id == track_id
    ).first()

    if not track:
        raise HTTPException(
            status_code=404,
            detail="Track not found"
        )

    # ========================
    # CHECK CONFERENCE TỒN TẠI
    # ========================
    conference = db.query(Conference).filter(
        Conference.id == track.conference_id
    ).first()

    if not conference:
        raise HTTPException(
            status_code=404,
            detail="Conference not found"
        )

    # ========================
    # CHECK THỜI GIAN HỘI NGHỊ (NV3)
    # ========================
    now = datetime.now()

    if now < conference.start_date:
        raise HTTPException(
            status_code=400,
            detail="Conference has not started yet. Cannot create topic."
        )

    if now > conference.end_date:
        raise HTTPException(
            status_code=400,
            detail="Conference has ended. Cannot create topic."
        )

    # ========================
    # HANDLE PICTURE
    # ========================
    picture_path = None
    if picture:
        os.makedirs("src/static/topic_pictures", exist_ok=True)
        file_path = f"src/static/topic_pictures/{picture.filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(picture.file, buffer)

        picture_path = f"topic_pictures/{picture.filename}"

    # ========================
    # CREATE TOPIC
    # ========================
    topic = Topic(
        name=name,
        description=description,
        track_id=track_id,
        picture=picture_path
    )

    db.add(topic)
    db.commit()
    db.refresh(topic)

    return {
        "message": "Topic created successfully",
        "topic": {
            "id": topic.id,
            "name": topic.name,
            "description": topic.description,
            "track_id": topic.track_id,
            "conference_id": track.conference_id,
            "picture": topic.picture
        }
    }
# ========================
# GET ALL TOPICS
# ========================
@router.get("/")
def get_topics(db: Session = Depends(get_db)):
    topics = db.query(Topic).all()
    result = []

    for topic in topics:
        track = db.query(Track).filter(Track.id == topic.track_id).first()

        result.append({
            "id": topic.id,
            "name": topic.name,
            "description": topic.description,
            "picture": topic.picture,
            "track_id": topic.track_id,
            "conference_id": track.conference_id if track else None
        })

    return result


# ========================
# GET TOPIC BY ID
# ========================
@router.get("/{topic_id}")
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    track = db.query(Track).filter(Track.id == topic.track_id).first()

    return {
        "id": topic.id,
        "name": topic.name,
        "description": topic.description,
        "picture": topic.picture,
        "track_id": topic.track_id,
        "conference_id": track.conference_id if track else None
    }


# ========================
# GET TOPICS BY TRACK
# ========================
@router.get("/track/{track_id}")
def get_topics_by_track(track_id: int, db: Session = Depends(get_db)):
    topics = db.query(Topic).filter(Topic.track_id == track_id).all()
    track = db.query(Track).filter(Track.id == track_id).first()

    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "picture": t.picture,
            "track_id": t.track_id,
            "conference_id": track.conference_id if track else None
        }
        for t in topics
    ]


# ========================
# UPDATE TOPIC (TEXT + PICTURE)
# ========================
@router.put("/{topic_id}", status_code=200)
def update_topic(
    topic_id: int,
    name: str = Form(None),
    description: str = Form(None),
    picture: UploadFile = File(None),
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "CHAIR")),
):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    track = db.query(Track).filter(Track.id == topic.track_id).first()
    

    # ===== BEFORE =====
    before = {
        "id": topic.id,
        "name": topic.name,
        "description": topic.description,
        "track_id": topic.track_id,
        "conference_id": track.conference_id if track else None,
        "picture": topic.picture
    }

    # update text
    if name is not None:
        topic.name = name

    if description is not None:
        topic.description = description

    # update picture
    if picture:
        os.makedirs("src/static/topic_pictures", exist_ok=True)
        file_path = f"src/static/topic_pictures/{picture.filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(picture.file, buffer)

        topic.picture = f"topic_pictures/{picture.filename}"

    db.commit()
    db.refresh(topic)

    # ===== AFTER =====
    after = {
        "id": topic.id,
        "name": topic.name,
        "description": topic.description,
        "track_id": topic.track_id,
        "conference_id": track.conference_id if track else None,
        "picture": topic.picture
    }

    return {
        "message": "Topic updated successfully",
        "before": before,
        "after": after
    }

# ========================
# DELETE TOPIC
# ========================
@router.delete("/{topic_id}", status_code=200)
def delete_topic(
    topic_id: int, 
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "CHAIR")),
    ):
    
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    track = db.query(Track).filter(Track.id == topic.track_id).first()

    deleted_data = {
        "id": topic.id,
        "name": topic.name,
        "description": topic.description,
        "track_id": topic.track_id,
        "conference_id": track.conference_id if track else None,
        "picture": topic.picture
    }

    db.delete(topic)
    db.commit()

    return {
        "message": "Topic deleted successfully",
        "deleted_topic": deleted_data
    }