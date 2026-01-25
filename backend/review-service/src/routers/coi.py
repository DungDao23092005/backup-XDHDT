# src/routers/coi.py
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.deps import get_db
from src import crud, schemas
from src.models import AssignmentStatus
from src.security.deps import get_current_payload, require_roles

router = APIRouter(prefix="/coi", tags=["COI"])


@router.get(
    "/",
    response_model=list[schemas.COIOut],
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
def list_coi(
    paper_id: Optional[int] = Query(default=None),
    reviewer_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    """
    REVIEWER: chỉ xem COI của chính mình (reviewer_id bị override = user_id)
    CHAIR/ADMIN: có thể filter paper_id/reviewer_id tuỳ ý
    """
    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    # reviewer chỉ xem COI của mình
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        reviewer_id = user_id

    return crud.list_coi(db, paper_id=paper_id, reviewer_id=reviewer_id)


@router.post(
    "/",
    response_model=schemas.COIOut,
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
def create_coi(
    data: schemas.COICreate,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    """
    REVIEWER: reviewer_id sẽ bị ép = user_id (không cho khai báo hộ người khác)
    CHAIR/ADMIN: được phép khai báo cho reviewer_id được gửi lên
    """
    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    # reviewer không được khai báo COI hộ người khác
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        data = schemas.COICreate(**{**data.model_dump(), "reviewer_id": user_id})

    # --- Validate ---
    # 1) prevent duplicates OPEN
    existing = crud.list_coi(db, paper_id=data.paper_id, reviewer_id=data.reviewer_id)
    for x in existing:
        status_val = getattr(x.status, "value", str(x.status))
        if status_val == "Open":
            raise HTTPException(400, "COI already declared (OPEN)")

    # 2) do NOT allow declare COI after review submitted (assignment completed)
    assignments = crud.list_assignments(db, reviewer_id=data.reviewer_id, paper_id=data.paper_id)
    for a in assignments:
        st = getattr(a.status, "value", str(a.status))
        if st == "Completed":
            raise HTTPException(400, "Cannot declare COI after review submitted")

    # 3) create COI
    coi = crud.create_coi(db, data)

    # 4) enforce: auto-decline any existing assignments (Invited/Accepted)
    for a in assignments:
        st = getattr(a.status, "value", str(a.status))
        if st in ("Invited", "Accepted"):
            a.status = AssignmentStatus.DECLINED
            a.response_date = datetime.utcnow()

    db.commit()
    db.refresh(coi)
    return coi
