from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session, selectinload
from typing import List
import json
import httpx
import os
import shutil

from .. import database, crud, schemas, exceptions, models
from ..config import settings
from ..utils.file_handler import save_paper_file, delete_paper_version_file

from ..security.deps import get_current_payload, require_roles

router = APIRouter(
    prefix="/submissions",
    tags=["Submissions"]
)

# -----------------------------
# Helpers
# -----------------------------
def _normalize_base_url(url: str) -> str:
    if not url:
        return ""
    return url.rstrip("/")

def _notification_endpoint() -> str:
    """
    settings.NOTIFICATION_SERVICE_URL trong project đang default là base URL (vd: http://localhost:8001).
    Nhưng notification-service thực tế nhận POST tại /api/notifications.
    Hàm này đảm bảo URL cuối cùng luôn trỏ đúng endpoint.
    """
    base = _normalize_base_url(settings.NOTIFICATION_SERVICE_URL)
    if not base:
        return "/api/notifications"
    if base.endswith("/api/notifications"):
        return base
    return f"{base}/api/notifications"

# --- HÀM GỌI API ---
def call_notification_service_task(payload: dict):
    notification_url = settings.NOTIFICATION_SERVICE_URL
    headers = {"X-Internal-Key": settings.INTERNAL_KEY}

    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.post(notification_url, json=payload, headers=headers)
            if res.status_code == 201:
                print(f"[Submission Service] Notification sent for Paper #{payload.get('paper_id')}")
            else:
                print(f"[Submission Service] Failed: {res.status_code} {res.text}")
    except Exception as e:
        print(f"[Submission Service] Connection Error: {str(e)}")



# -----------------------------
# Reviewer/Chair/Admin: Open papers for bidding
# -----------------------------
@router.get(
    "/open-for-bidding",
    response_model=List[schemas.PaperResponse],
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
def get_open_papers_for_bidding(
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    """
    Danh sách bài mở cho bidding (mặc định: status = SUBMITTED).
    """
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    papers = (
        db.query(models.Paper)
        .options(
            selectinload(models.Paper.authors),
            selectinload(models.Paper.topics),
            selectinload(models.Paper.versions),
        )
        .filter(models.Paper.status == models.PaperStatus.SUBMITTED)
        .order_by(models.Paper.submitted_at.desc())
        .all()
    )
    return papers


# API nộp bài: AUTHOR/ADMIN
@router.post(
    "/",
    response_model=schemas.PaperResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(["AUTHOR", "ADMIN"]))],
)
def submit_paper(
    background_tasks: BackgroundTasks,
    metadata: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    created_paper_id = None
    created_version_number = None

    submitter_id = payload.get("user_id")
    if not submitter_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    try:
        try:
            data_dict = json.loads(metadata)
            paper_data = schemas.PaperCreate(**data_dict)
        except Exception as json_error:
            raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(json_error)}")

        paper = crud.create_paper(
            db=db,
            paper_data=paper_data,
            submitter_id=submitter_id,
        )
        created_paper_id = paper.id

        version = crud.create_new_paper_version(
            db=db,
            paper_id=paper.id,
            file_url="TEMP_URL_HOLDER",
            is_blind_mode=paper.is_blind_mode,
        )
        created_version_number = version.version_number

        file_url = save_paper_file(
            paper_id=paper.id,
            version_number=version.version_number,
            upload_file=file,
        )
        version.file_url = file_url

        db.commit()
        db.refresh(paper)

        recipient_email = None
        recipient_name = "Author"

        if paper_data.authors:
            recipient_email = paper_data.authors[0].email
            recipient_name = paper_data.authors[0].full_name

            for author in paper_data.authors:
                if author.is_corresponding:
                    recipient_email = author.email
                    recipient_name = author.full_name
                    break

        notification_payload = {
            "receiver_id": submitter_id,
            "receiver_email": recipient_email,
            "receiver_name": recipient_name,
            "paper_id": paper.id,
            "paper_title": paper.title,
            "subject": f"Xác nhận nộp bài: {paper.title}",
            "body": f"Bài báo #{paper.id} đã được nộp thành công vào hệ thống. Vui lòng chờ phản hồi.",
        }
        background_tasks.add_task(call_notification_service_task, notification_payload)


        return paper

    except Exception as e:
        db.rollback()
        print(f" Error submitting paper: {str(e)}")

        if created_paper_id is not None and created_version_number is not None:
            try:
                delete_paper_version_file(
                    paper_id=created_paper_id,
                    version_number=created_version_number,
                )
            except Exception as cleanup_error:
                print(f" Failed to clean up file: {cleanup_error}")

        raise HTTPException(status_code=400, detail=f"Submission failed: {str(e)}")


# Danh sách bài đã nộp: AUTHOR/ADMIN (chỉ của chính mình)
@router.get(
    "",
    response_model=List[schemas.PaperResponse],
    dependencies=[Depends(require_roles(["AUTHOR", "ADMIN"]))],
)
def get_my_submissions(
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    submitter_id = payload.get("user_id")
    if not submitter_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    return crud.get_papers_by_author(db, submitter_id)


# Xem chi tiết bài báo: AUTHOR/ADMIN (chỉ của chính mình)
@router.get(
    "/{paper_id}",
    response_model=schemas.PaperResponse,
    dependencies=[Depends(require_roles(["AUTHOR", "ADMIN"]))],
)
def get_submission_detail(
    paper_id: int,
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    submitter_id = payload.get("user_id")
    if not submitter_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    try:
        return crud.get_author_paper_detail(db=db, paper_id=paper_id, submitter_id=submitter_id)

    except exceptions.PaperNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except exceptions.NotAuthorizedError as e:
        raise HTTPException(status_code=403, detail=str(e))


# Thêm tác giả: AUTHOR/ADMIN
@router.post(
    "/{paper_id}/authors",
    response_model=schemas.AuthorResponse,
    dependencies=[Depends(require_roles(["AUTHOR", "ADMIN"]))],
)
def add_co_author(
    paper_id: int,
    author_data: schemas.AuthorAdd,
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    submitter_id = payload.get("user_id")
    if not submitter_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    try:
        return crud.add_author(db, paper_id, submitter_id, author_data)

    except exceptions.PaperNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except exceptions.NotAuthorizedError as e:
        raise HTTPException(status_code=403, detail=e.message)
    except exceptions.BusinessRuleError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Xoá tác giả: AUTHOR/ADMIN
@router.delete(
    "/{paper_id}/authors/{author_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(["AUTHOR", "ADMIN"]))],
)
def remove_co_author(
    paper_id: int,
    author_id: int,
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    submitter_id = payload.get("user_id")
    if not submitter_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    try:
        crud.remove_author(db, paper_id, author_id, submitter_id)
        return
    except exceptions.AuthorNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except exceptions.NotAuthorizedError as e:
        raise HTTPException(status_code=403, detail=e.message)
    except exceptions.BusinessRuleError as e:
        raise HTTPException(status_code=400, detail=e.message)


# Rút bài: AUTHOR/ADMIN
@router.post(
    "/{paper_id}/withdraw",
    response_model=schemas.PaperResponse,
    dependencies=[Depends(require_roles(["AUTHOR", "ADMIN"]))],
)
def withdraw_submission(
    paper_id: int,
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    submitter_id = payload.get("user_id")
    if not submitter_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    try:
        return crud.withdraw_paper(db, paper_id, submitter_id)
    except exceptions.PaperNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except exceptions.NotAuthorizedError as e:
        raise HTTPException(status_code=403, detail=e.message)
    except exceptions.BusinessRuleError as e:
        raise HTTPException(status_code=400, detail=e.message)


# Update metadata: AUTHOR/ADMIN
@router.put(
    "/{paper_id}",
    response_model=schemas.PaperResponse,
    dependencies=[Depends(require_roles(["AUTHOR", "ADMIN"]))],
)
def update_paper_details(
    paper_id: int,
    update_data: schemas.PaperUpdate,
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    submitter_id = payload.get("user_id")
    if not submitter_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    try:
        return crud.update_paper_metadata(db, paper_id, submitter_id, update_data)
    except exceptions.PaperNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except exceptions.NotAuthorizedError as e:
        raise HTTPException(status_code=403, detail=e.message)
    except exceptions.BusinessRuleError as e:
        raise HTTPException(status_code=400, detail=e.message)


# Upload new file version: AUTHOR/ADMIN
@router.post(
    "/{paper_id}/file",
    response_model=schemas.PaperVersionResponse,
    dependencies=[Depends(require_roles(["AUTHOR", "ADMIN"]))],
)
def update_paper_file(
    paper_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    submitter_id = payload.get("user_id")
    if not submitter_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    try:
        next_ver = crud.get_next_version_number(db, paper_id)

        base_dir = f"uploads/papers/{paper_id}/v{next_ver}"
        os.makedirs(base_dir, exist_ok=True)

        file_path = f"{base_dir}/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return crud.upload_new_version(
            db=db,
            paper_id=paper_id,
            submitter_id=submitter_id,
            file_path=file_path,
            version_number=next_ver,
            is_blind_mode=True,
        )

    except exceptions.PaperNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except exceptions.NotAuthorizedError as e:
        raise HTTPException(status_code=403, detail=e.message)
    except exceptions.BusinessRuleError as e:
        raise HTTPException(status_code=400, detail=e.message)


# Quyết định bài: CHAIR/ADMIN
@router.put(
    "/{paper_id}/decision",
    response_model=schemas.PaperResponse,
    dependencies=[Depends(require_roles(["CHAIR", "ADMIN"]))],
)
def make_decision_on_paper(
    paper_id: int,
    decision: schemas.PaperDecision,
    db: Session = Depends(database.get_db),
):
    try:
        return crud.update_paper_decision(db=db, paper_id=paper_id, decision_data=decision)
    except exceptions.PaperNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except exceptions.BusinessRuleError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Camera-ready: AUTHOR/ADMIN (chủ bài)
@router.post(
    "/{paper_id}/camera-ready",
    response_model=schemas.PaperVersionResponse,
    dependencies=[Depends(require_roles(["AUTHOR", "ADMIN"]))],
)
def upload_camera_ready(
    paper_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    submitter_id = payload.get("user_id")
    if not submitter_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    upload_dir = f"uploads/papers/{paper_id}"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = f"{upload_dir}/camera_ready_{file.filename}"

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    try:
        return crud.submit_camera_ready(db=db, paper_id=paper_id, submitter_id=submitter_id, file_path=file_path)
    except exceptions.PaperNotFoundError as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=404, detail=str(e))
    except exceptions.BusinessRuleError as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=str(e))
    
    
# UPDATE tác giả: AUTHOR/ADMIN
@router.put(
    "/{paper_id}/authors/{author_id}",
    response_model=schemas.AuthorResponse,
    dependencies=[Depends(require_roles(["AUTHOR", "ADMIN"]))],
)
def update_author(
    paper_id: int,
    author_id: int,
    author_data: schemas.AuthorUpdate,   # tạo schema mới
    db: Session = Depends(database.get_db),
    payload=Depends(get_current_payload),
):
    submitter_id = payload.get("user_id")
    if not submitter_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    try:
        return crud.update_author(db, paper_id, author_id, submitter_id, author_data)
    except exceptions.PaperNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except exceptions.AuthorNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except exceptions.NotAuthorizedError as e:
        raise HTTPException(status_code=403, detail=e.message)
    except exceptions.BusinessRuleError as e:
        raise HTTPException(status_code=400, detail=e.message)
