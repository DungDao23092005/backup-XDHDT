from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from src.deps import get_db
from src.security.deps import get_current_payload, require_roles
from src import models, schemas, crud
from src.utils.notification_client import send_notification  # Import client thông báo

router = APIRouter(prefix="/rebuttals", tags=["Rebuttals"])

@router.post(
    "/",
    response_model=schemas.RebuttalOut,
    dependencies=[Depends(require_roles(["AUTHOR"]))],
)
def create_rebuttal(
    data: schemas.RebuttalCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    """
    Tác giả nộp giải trình (Rebuttal).
    Hệ thống sẽ gửi thông báo cho tất cả Reviewer đang chấm bài này.
    """
    user_id = payload.get("user_id")
    
    # 1. Tạo Rebuttal trong DB
    try:
        rebuttal = crud.create_rebuttal(db, data, author_id=user_id)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    # 2. Gửi thông báo cho Reviewers
    # Chỉ gửi cho những Reviewer có trạng thái ACCEPTED hoặc COMPLETED (đã nhận bài)
    assignments = db.query(models.Assignment).filter(
        models.Assignment.paper_id == data.paper_id,
        models.Assignment.status.in_([
            models.AssignmentStatus.ACCEPTED, 
            models.AssignmentStatus.COMPLETED
        ])
    ).all()

    for assign in assignments:
        background_tasks.add_task(
            send_notification,
            user_id=assign.reviewer_id,
            subject=f"Tác giả đã nộp Rebuttal cho bài #{data.paper_id}",
            body=f"Tác giả vừa gửi giải trình (rebuttal). Vui lòng kiểm tra và cập nhật bài đánh giá của bạn nếu cần.",
            paper_id=data.paper_id
        )

    return rebuttal


@router.get("/paper/{paper_id}", response_model=schemas.RebuttalOut)
def get_rebuttal_by_paper(
    paper_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload)
):
    """
    Lấy thông tin Rebuttal của bài báo.
    - Reviewer: Chỉ xem được nếu được phân công bài này.
    - Chair/Admin: Xem được tất cả.
    """
    user_id = payload.get("user_id")
    roles = set(payload.get("roles") or [])
    
    # Check quyền: Nếu không phải Chair/Admin thì phải là Reviewer được gán bài
    if "CHAIR" not in roles and "ADMIN" not in roles:
        # Tìm xem reviewer có assignment với paper này không
        assign = db.query(models.Assignment).filter(
            models.Assignment.paper_id == paper_id,
            models.Assignment.reviewer_id == user_id
        ).first()
        
        # Nếu cũng không phải Reviewer được gán -> Check xem có phải chính Author không
        # (Tùy logic frontend, thường author xem ở trang submission nhưng API này mở cũng được)
        # Tạm thời strict cho Reviewer assign check:
        if not assign:
             # Nếu muốn cho Author xem lại rebuttal của chính mình thì thêm logic check user_id == rebuttal.author_id sau khi query
             pass 

        if not assign and "AUTHOR" not in roles: # Cho phép Author xem lại nếu cần
             raise HTTPException(403, "You are not assigned to this paper")

    # Lấy Rebuttal
    rebuttal = crud.get_rebuttal_by_paper(db, paper_id)
    
    if not rebuttal:
        raise HTTPException(404, "No rebuttal found for this paper")
    
    # Nếu là Author thì phải check đúng author của bài (Logic phụ)
    if "CHAIR" not in roles and "ADMIN" not in roles and "REVIEWER" not in roles:
        if rebuttal.author_id != user_id:
             raise HTTPException(403, "Not your rebuttal")
        
    return rebuttal