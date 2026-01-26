# src/routers/coi.py
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from sqlalchemy.orm import Session

from src.deps import get_db
from src import crud, schemas, models
from src.models import AssignmentStatus, ConflictStatus
from src.security.deps import get_current_payload, require_roles

router = APIRouter(prefix="/coi", tags=["COI"])


def _enum_value(x) -> str:
    return getattr(x, "value", str(x))


def _normalize_conflict_status(val: Optional[str]) -> Optional[ConflictStatus]:
    if val is None:
        return None
    s = val.strip().lower()
    if s in ("open", "opened"):
        return ConflictStatus.OPEN
    if s in ("resolved", "resolve", "closed", "close"):
        return ConflictStatus.RESOLVED
    return None

def _normalize_conflict_type(val: Optional[str]) -> Optional[models.ConflictType]:
    if val is None:
        return None
    s = val.strip()
    for t in models.ConflictType:
        if t.value == s:
            return t
    return None


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


@router.patch(
    "/{coi_id}",
    response_model=schemas.COIOut,
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
def update_or_resolve_coi(
    coi_id: int = Path(..., ge=1),
    data: Optional[schemas.COIUpdate] = Body(None),
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    """
    PATCH /coi/{coi_id}

    REVIEWER:
      - chỉ được "đóng" COI của chính mình: status -> Resolved
      - có thể cập nhật description (tuỳ bạn)
      - sau khi Resolved, sẽ reset assignment (nếu đang Declined/COI) về Invited để reviewer có thể Accept lại

    CHAIR/ADMIN:
      - có thể update status/type/description (nhưng vẫn nên hợp lệ)
    """
    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    obj = crud.get_coi(db, coi_id)
    if not obj:
        raise HTTPException(404, "COI not found")

    is_reviewer_only = "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles

    # Reviewer chỉ thao tác COI của chính mình
    if is_reviewer_only and obj.reviewer_id != user_id:
        raise HTTPException(403, "Not your COI")

    # Không cho resolve nếu đã có review submitted cho paper này của reviewer này
    assignments = crud.list_assignments(db, reviewer_id=obj.reviewer_id, paper_id=obj.paper_id)
    for a in assignments:
        if crud.has_submitted_review(db, a.id):
            raise HTTPException(400, "Cannot resolve COI after review submitted")

    payload_in = (data.model_dump(exclude_unset=True) if data else {})

    # --- Update rules ---
    if is_reviewer_only:
        # Reviewer: bắt buộc chỉ được resolve (đóng)
        if _enum_value(obj.status) != "Open":
            raise HTTPException(400, "COI is not OPEN")

        obj.status = ConflictStatus.RESOLVED

        # optional: allow reviewer edit description khi đóng COI
        if "description" in payload_in:
            obj.description = payload_in.get("description")

        # optional: KHÔNG cho reviewer đổi type
        # if "type" in payload_in: ignore

    else:
        # CHAIR/ADMIN: có thể update theo payload
        if "status" in payload_in:
            st = _normalize_conflict_status(payload_in.get("status"))
            if st is None:
                raise HTTPException(400, "Invalid COI status (use Open/Resolved)")
            obj.status = st

        if "description" in payload_in:
            obj.description = payload_in.get("description")

        if "type" in payload_in:
            t = _normalize_conflict_type(payload_in.get("type"))
            if t is None:
                raise HTTPException(400, "Invalid COI type")
            obj.type = t

    # --- Side effect: nếu đã resolve thì mở lại assignment về Invited để reviewer Accept lại ---
    if _enum_value(obj.status) == "Resolved":
        for a in assignments:
            st = _enum_value(a.status)
            if st in ("Declined", "COI"):
                a.status = AssignmentStatus.INVITED
                a.response_date = None

    db.commit()
    db.refresh(obj)
    return obj
