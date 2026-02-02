from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import requests

from src import database, models

router = APIRouter(prefix="/reviewers", tags=["Reviewers"])

@router.get("/accepted")
def get_accepted_reviewers(conference_id: int, db: Session = Depends(get_db)):
    accepted = requests.get(
        f"http://notification-service:8000/api/notifications/reviewer-invitations"
        f"?conference_id={conference_id}&status=ACCEPTED",
        timeout=5
    ).json()

    users = requests.get(
        "http://identity-service:8000/api/users",  # nếu có filter role thì tốt hơn
        timeout=5
    ).json()

    # lọc reviewer role
    reviewer_users = [u for u in users if any(r.get("name") == "REVIEWER" for r in (u.get("roles") or []))]

    accepted_emails = set([x["reviewer_email"].lower() for x in accepted])

    return [
        u for u in reviewer_users
        if (u.get("email") or "").lower() in accepted_emails
    ]


@router.post("/invite")
def invite_reviewer(
    conference_id: int,
    reviewer_email: str,
    db: Session = Depends(database.get_db)
):
    # 1. Lấy dữ liệu conference từ DB
    conference = db.query(models.Conference)\
        .filter(models.Conference.id == conference_id)\
        .first()

    if not conference:
        return {"error": "Conference not found"}

    # 2. Gửi sang Notification Service (BƯỚC 6)
    payload = {
        "conference_id": conference.id,
        "conference_name": conference.name,
        "conference_time": str(conference.start_date),
        "conference_location": conference.location,
        "reviewer_email": reviewer_email
    }

    requests.post(
    "http://notification-service:8000/api/notifications/reviewer-invite",
    json=payload,
    timeout=5
)

    return {"message": "Reviewer invited"}
