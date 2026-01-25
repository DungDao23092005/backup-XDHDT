import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from src.deps import get_db
from src import crud
from src.config import SUBMISSION_SERVICE_URL
from src.security.deps import get_current_payload, require_roles

router = APIRouter(prefix="/papers", tags=["Papers (helper)"])


@router.get(
    "/{assignment_id}/pdf-url",
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
async def get_pdf_url(
    assignment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    ass = crud.get_assignment(db, assignment_id)
    if not ass:
        raise HTTPException(404, "Assignment not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    # Reviewer chỉ xem paper của assignment mình
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        if ass.reviewer_id != user_id:
            raise HTTPException(403, "Not your assignment")

    auth = request.headers.get("Authorization")

    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"{SUBMISSION_SERVICE_URL}/submissions/{ass.paper_id}",
            headers={"Authorization": auth} if auth else None,
        )

    if r.status_code != 200:
        raise HTTPException(502, f"Cannot fetch paper from submission-service: {r.text}")

    data = r.json()
    versions = data.get("versions") or []
    if not versions:
        raise HTTPException(404, "No versions found for this paper")

    latest = max(versions, key=lambda v: v.get("version_number", 0))
    file_url = latest.get("file_url")
    if not file_url:
        raise HTTPException(404, "file_url missing")

    return {
        "paper_id": ass.paper_id,
        "version_number": latest.get("version_number"),
        "pdf_url": f"{SUBMISSION_SERVICE_URL}/static{file_url}",
    }
