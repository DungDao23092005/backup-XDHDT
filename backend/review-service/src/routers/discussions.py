from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.deps import get_db
from src import crud, schemas
from src.security.deps import get_current_payload, require_roles

router = APIRouter(prefix="/discussions", tags=["Review Discussions"])


@router.post(
    "/",
    response_model=schemas.DiscussionOut,
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
def create_discussion(
    data: schemas.DiscussionCreate,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(401, "Token missing user_id")

    # Reviewer chỉ được thảo luận paper mình được assign
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        ass = crud.list_assignments(db, reviewer_id=user_id, paper_id=data.paper_id)
        if not ass:
            raise HTTPException(403, "Not assigned to this paper")

    sender_id = user_id
    return crud.create_discussion(db, data, sender_id=sender_id)


@router.get(
    "/paper/{paper_id}",
    response_model=list[schemas.DiscussionOut],
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
def list_discussions(
    paper_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(401, "Token missing user_id")

    # Reviewer chỉ xem discussion paper mình được assign
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        ass = crud.list_assignments(db, reviewer_id=user_id, paper_id=paper_id)
        if not ass:
            raise HTTPException(403, "Not assigned to this paper")

    return crud.list_discussions(db, paper_id)
