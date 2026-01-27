from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.deps import get_db
from src import crud, schemas
from src.models import AssignmentStatus
from src.security.deps import get_current_payload, require_roles

router = APIRouter(prefix="/reviews", tags=["Reviews"])


def _enum_value(x) -> str:
    return getattr(x, "value", str(x))


@router.post(
    "/",
    response_model=schemas.ReviewOut,
    dependencies=[Depends(require_roles(["REVIEWER", "ADMIN"]))],
)
def create_review(
    data: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    ass = crud.get_assignment(db, data.assignment_id)
    if not ass:
        raise HTTPException(400, "assignment_id not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    if "ADMIN" not in roles and ass.reviewer_id != user_id:
        raise HTTPException(403, "Not your assignment")

    ass_status = _enum_value(ass.status)

    # only Accepted can create review
    if ass_status != "Accepted":
        raise HTTPException(400, "Assignment must be Accepted before creating a review")

    # COI block
    if crud.has_open_coi(db, reviewer_id=ass.reviewer_id, paper_id=ass.paper_id):
        raise HTTPException(400, "COI detected: cannot create review for this paper")

    return crud.create_review(db, data)


@router.get(
    "/",
    response_model=list[schemas.ReviewOut],
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
def list_reviews(
    assignment_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    # reviewer bắt buộc lọc theo assignment của mình
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        if assignment_id is None:
            raise HTTPException(400, "assignment_id is required for reviewer")
        ass = crud.get_assignment(db, assignment_id)
        if not ass or ass.reviewer_id != user_id:
            raise HTTPException(403, "Not your assignment")

    return crud.list_reviews(db, assignment_id=assignment_id)


@router.get(
    "/{review_id}",
    response_model=schemas.ReviewOut,
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
def get_review(
    review_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    obj = crud.get_review(db, review_id)
    if not obj:
        raise HTTPException(404, "Review not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        ass = crud.get_assignment(db, obj.assignment_id)
        if not ass or ass.reviewer_id != user_id:
            raise HTTPException(403, "Not your review")

    return obj


@router.patch(
    "/{review_id}",
    response_model=schemas.ReviewOut,
    dependencies=[Depends(require_roles(["REVIEWER", "ADMIN"]))],
)
def update_review(
    review_id: int,
    data: schemas.ReviewUpdate,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    obj = crud.get_review(db, review_id)
    if not obj:
        raise HTTPException(404, "Review not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    if "ADMIN" not in roles:
        ass = crud.get_assignment(db, obj.assignment_id)
        if not ass or ass.reviewer_id != user_id:
            raise HTTPException(403, "Not your review")

        # FIX: Cho phép sửa nếu muốn revert về draft (is_draft=True)
        is_reverting = data.is_draft is True
        if hasattr(obj, "submitted_at") and getattr(obj, "submitted_at") is not None:
            if not is_reverting:
                raise HTTPException(400, "Review already submitted. You must Un-submit first.")
            
            # Nếu đang Revert, ta reset submitted_at và status của assignment
            obj.submitted_at = None
            if ass.status == AssignmentStatus.COMPLETED:
                ass.status = AssignmentStatus.ACCEPTED
                db.add(ass)

    updated = crud.update_review(db, review_id, data)
    if not updated:
        raise HTTPException(404, "Review not found")
    return updated


@router.post(
    "/{review_id}/criterias",
    response_model=schemas.ReviewCriteriaOut,
    dependencies=[Depends(require_roles(["REVIEWER", "ADMIN"]))],
)
def add_criteria(
    review_id: int,
    data: schemas.ReviewCriteriaCreate,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    rev = crud.get_review(db, review_id)
    if not rev:
        raise HTTPException(404, "Review not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    if "ADMIN" not in roles:
        ass = crud.get_assignment(db, rev.assignment_id)
        if not ass or ass.reviewer_id != user_id:
            raise HTTPException(403, "Not your review")

        # block after submit
        if hasattr(rev, "submitted_at") and getattr(rev, "submitted_at") is not None:
            raise HTTPException(400, "Review already submitted; cannot add criteria")

    return crud.add_review_criteria(db, review_id, data)


@router.post(
    "/{review_id}/submit",
    response_model=schemas.ReviewOut,
    dependencies=[Depends(require_roles(["REVIEWER", "ADMIN"]))],
)
def submit_review(
    review_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    rev = crud.get_review(db, review_id)
    if not rev:
        raise HTTPException(404, "Review not found")

    ass = crud.get_assignment(db, rev.assignment_id)
    if not ass:
        raise HTTPException(400, "Assignment not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    if "ADMIN" not in roles and ass.reviewer_id != user_id:
        raise HTTPException(403, "Not your review")

    if _enum_value(ass.status) != "Accepted":
        raise HTTPException(400, "Assignment must be Accepted before submitting review")

    if crud.has_open_coi(db, reviewer_id=ass.reviewer_id, paper_id=ass.paper_id):
        raise HTTPException(400, "COI detected: cannot submit review")

    # mark submitted
    if hasattr(rev, "is_draft"):
        setattr(rev, "is_draft", False)
    if hasattr(rev, "submitted_at"):
        setattr(rev, "submitted_at", datetime.utcnow())

    ass.status = AssignmentStatus.COMPLETED

    db.commit()
    db.refresh(rev)
    return rev

@router.patch(
    "/{review_id}/criterias/{criteria_id}",
    response_model=schemas.ReviewCriteriaOut,
    dependencies=[Depends(require_roles(["REVIEWER", "ADMIN"]))],
)
def update_criteria(
    review_id: int,
    criteria_id: int,
    data: schemas.ReviewCriteriaUpdate,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    rev = crud.get_review(db, review_id)
    if not rev:
        raise HTTPException(404, "Review not found")

    crit = crud.get_review_criteria(db, criteria_id)
    if not crit or crit.review_id != review_id:
        raise HTTPException(404, "Criteria not found for this review")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    if "ADMIN" not in roles:
        ass = crud.get_assignment(db, rev.assignment_id)
        if not ass or ass.reviewer_id != user_id:
            raise HTTPException(403, "Not your review")

        # block after submit
        if rev.submitted_at is not None:
            raise HTTPException(400, "Review already submitted; cannot edit criteria")

    updated = crud.update_review_criteria(db, criteria_id, data)
    if not updated:
        raise HTTPException(404, "Criteria not found")
    return updated