from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session

from src.deps import get_db
from src import crud, schemas
from src.models import AssignmentStatus
from src.security.deps import get_current_payload, require_roles
# Import client thông báo (đảm bảo bạn đã tạo file này ở bước trước)
from src.utils.notification_client import send_notification

router = APIRouter(prefix="/assignments", tags=["Assignments"])


def _enum_value(x) -> str:
    return getattr(x, "value", str(x))


@router.post(
    "/",
    response_model=schemas.AssignmentOut,
    dependencies=[Depends(require_roles(["CHAIR", "ADMIN"]))],
)
def create_assignment(
    data: schemas.AssignmentCreate,
    background_tasks: BackgroundTasks,  # <--- Inject BackgroundTasks
    db: Session = Depends(get_db)
):
    # 1. Tạo assignment trong DB
    assignment = crud.create_assignment(db, data)

    # 2. Gửi thông báo cho Reviewer (Chạy nền để không block response)
    if assignment:
        background_tasks.add_task(
            send_notification,
            user_id=assignment.reviewer_id,
            subject="Lời mời phản biện từ Ban tổ chức",
            body=f"Bạn nhận được lời mời phản biện cho bài báo #{assignment.paper_id}. Vui lòng kiểm tra và phản hồi.",
            paper_id=assignment.paper_id
        )

    return assignment


@router.get(
    "/",
    response_model=list[schemas.AssignmentOut],
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
def list_assignments(
    reviewer_id: Optional[int] = Query(default=None),
    paper_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(401, "Token missing user_id")

    # reviewer chỉ xem assignment của mình
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        reviewer_id = user_id

    return crud.list_assignments(db, reviewer_id=reviewer_id, paper_id=paper_id)


@router.get(
    "/{assignment_id}",
    response_model=schemas.AssignmentOut,
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    obj = crud.get_assignment(db, assignment_id)
    if not obj:
        raise HTTPException(404, "Assignment not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    # reviewer chỉ được xem assignment của mình
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        if obj.reviewer_id != user_id:
            raise HTTPException(403, "Not your assignment")

    return obj


@router.patch(
    "/{assignment_id}",
    response_model=schemas.AssignmentOut,
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
def update_assignment(
    assignment_id: int,
    data: schemas.AssignmentUpdate,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    """
    REVIEWER: chỉ được update status = Accepted/Declined cho assignment của mình
    CHAIR/ADMIN: được update các field theo schema (tuỳ bạn định nghĩa)
    """
    ass = crud.get_assignment(db, assignment_id)
    if not ass:
        raise HTTPException(404, "Assignment not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    # reviewer ownership check
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        if ass.reviewer_id != user_id:
            raise HTTPException(403, "Not your assignment")

    patch = data.model_dump(exclude_unset=True)

    incoming_status = patch.get("status")
    if incoming_status is not None:
        incoming_status = str(incoming_status).strip()

    current_status = _enum_value(ass.status)
    allowed = {s.value for s in AssignmentStatus}

    if incoming_status is not None and incoming_status not in allowed:
        raise HTTPException(400, f"Invalid status '{incoming_status}'. Allowed: {sorted(list(allowed))}")

    # reviewer chỉ được đổi status accept/decline
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        allowed_reviewer = {AssignmentStatus.ACCEPTED.value, AssignmentStatus.DECLINED.value}
        if incoming_status is None or incoming_status not in allowed_reviewer:
            raise HTTPException(403, "Reviewer can only set status to Accepted/Declined")

    # business rules
    if incoming_status == AssignmentStatus.ACCEPTED.value:
        # COI block
        if crud.has_open_coi(db, reviewer_id=ass.reviewer_id, paper_id=ass.paper_id):
            raise HTTPException(400, "COI declared: cannot accept this assignment")

        # only Invited -> Accepted (optional strict)
        if current_status not in (AssignmentStatus.INVITED.value, AssignmentStatus.ACCEPTED.value):
            raise HTTPException(400, f"Cannot accept from status {current_status}")

    if incoming_status == AssignmentStatus.COMPLETED.value:
        # only Accepted -> Completed
        if current_status != AssignmentStatus.ACCEPTED.value:
            raise HTTPException(400, "Only ACCEPTED assignments can be completed")

    if incoming_status in (AssignmentStatus.ACCEPTED.value, AssignmentStatus.DECLINED.value):
        if patch.get("response_date") is None:
            patch["response_date"] = datetime.utcnow()

    enforced = schemas.AssignmentUpdate(**patch)
    updated = crud.update_assignment(db, assignment_id, enforced)
    if not updated:
        raise HTTPException(404, "Assignment not found")
    return updated


@router.post(
    "/{assignment_id}/accept",
    response_model=schemas.AssignmentOut,
    dependencies=[Depends(require_roles(["REVIEWER", "ADMIN"]))],
)
def accept_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    ass = crud.get_assignment(db, assignment_id)
    if not ass:
        raise HTTPException(404, "Assignment not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    if "ADMIN" not in roles and ass.reviewer_id != user_id:
        raise HTTPException(403, "Not your assignment")

    if crud.has_open_coi(db, reviewer_id=ass.reviewer_id, paper_id=ass.paper_id):
        raise HTTPException(400, "COI declared: cannot accept this assignment")

    cur = _enum_value(ass.status)
    if cur not in ("Invited", "Accepted"):
        raise HTTPException(400, f"Cannot accept from status {cur}")

    ass.status = AssignmentStatus.ACCEPTED
    ass.response_date = datetime.utcnow()
    db.commit()
    db.refresh(ass)
    return ass


@router.post(
    "/{assignment_id}/decline",
    response_model=schemas.AssignmentOut,
    dependencies=[Depends(require_roles(["REVIEWER", "ADMIN"]))],
)
def decline_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    ass = crud.get_assignment(db, assignment_id)
    if not ass:
        raise HTTPException(404, "Assignment not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    if "ADMIN" not in roles and ass.reviewer_id != user_id:
        raise HTTPException(403, "Not your assignment")

    ass.status = AssignmentStatus.DECLINED
    ass.response_date = datetime.utcnow()
    db.commit()
    db.refresh(ass)
    return ass