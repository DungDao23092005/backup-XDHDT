import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.deps import get_db
from src import crud
from src.config import SUBMISSION_SERVICE_URL
from src.security.deps import get_current_payload, require_roles

router = APIRouter(prefix="/papers", tags=["Papers (helper)"])

# Endpoint cũ (get_pdf_url) có thể giữ lại hoặc bỏ tùy bạn, 
# nhưng endpoint dưới đây mới là cái quan trọng cho tính năng tải bảo mật.

@router.get(
    "/{assignment_id}/download",
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
async def download_paper_pdf(
    assignment_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    """
    Proxy download: Reviewer -> Review Service -> Submission Service -> File
    Đảm bảo Reviewer chỉ tải được bài mình được phân công.
    """
    # 1. Kiểm tra quyền sở hữu Assignment
    ass = crud.get_assignment(db, assignment_id)
    if not ass:
        raise HTTPException(404, "Assignment not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    # Reviewer chỉ được tải bài mình được phân công
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        if ass.reviewer_id != user_id:
            raise HTTPException(403, "Not your assignment")

    # 2. Gọi sang Submission Service để lấy metadata (tìm đường dẫn file mới nhất)
    # Lưu ý: SUBMISSION_SERVICE_URL trong config thường là "http://submission-service:8000"
    sub_url = SUBMISSION_SERVICE_URL.rstrip("/")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Gọi API public hoặc internal để lấy info bài báo
            r = await client.get(f"{sub_url}/submissions/{ass.paper_id}")
    except Exception as e:
        raise HTTPException(502, f"Failed to connect to Submission Service: {str(e)}")

    if r.status_code != 200:
        raise HTTPException(502, f"Cannot fetch paper metadata from submission-service: {r.text}")

    data = r.json()
    versions = data.get("versions") or []
    if not versions:
        raise HTTPException(404, "No PDF version found for this paper")

    # Lấy version mới nhất
    latest = max(versions, key=lambda v: v.get("version_number", 0))
    # file_url trong DB submission có dạng relative: "papers/10/v1/paper.pdf"
    relative_path = latest.get("file_url")
    
    if not relative_path:
        raise HTTPException(404, "File path missing in metadata")

    # 3. Stream file từ Submission Service (qua static mount /uploads)
    # Xử lý đường dẫn: đảm bảo không bị double slash
    clean_path = relative_path.lstrip("/")
    # URL nội bộ đến static file bên service submission
    download_url = f"{sub_url}/uploads/{clean_path}"

    async def iterfile():
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("GET", download_url) as resp:
                if resp.status_code != 200:
                    # Nếu file vật lý không tồn tại bên kia
                    raise HTTPException(404, "File not found on storage server")
                async for chunk in resp.aiter_bytes():
                    yield chunk

    # Đặt tên file khi tải về (VD: Paper_10_v1.pdf)
    filename = f"Paper_{ass.paper_id}_v{latest.get('version_number')}.pdf"
    
    return StreamingResponse(
        iterfile(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )