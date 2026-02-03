# backend/review-service/src/routers/papers.py
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.deps import get_db
from src import crud
from src.config import SUBMISSION_SERVICE_URL
from src.security.deps import get_current_payload, require_roles

router = APIRouter(prefix="/papers", tags=["Papers (helper)"])

INTERNAL_KEY = os.getenv("INTERNAL_KEY", "")


def _clean_relative_path(p: str) -> str:
    """
    Chuẩn hoá đường dẫn file, xử lý cả trường hợp Windows path (\)
    """
    if not p:
        return ""
    s = str(p).strip()
    # [FIX] Thay thế backslash (\) thành slash (/) để chuẩn Linux/Web
    s = s.replace("\\", "/") 
    s = s.lstrip("/")
    if s.startswith("uploads/"):
        s = s[len("uploads/") :]
    return s


def _build_internal_headers() -> dict:
    headers = {}
    if INTERNAL_KEY:
        headers["x-internal-key"] = INTERNAL_KEY
    return headers


async def _preflight_file_exists(client: httpx.AsyncClient, url: str) -> dict:
    try:
        r = await client.head(url, follow_redirects=True)
        if r.status_code == 200:
            return dict(r.headers)
        if r.status_code == 404:
            raise HTTPException(status_code=404, detail="File not found on storage server")
    except HTTPException:
        raise
    except Exception:
        # Fallback to GET range if HEAD fails
        pass

    try:
        r = await client.get(url, follow_redirects=True, headers={"Range": "bytes=0-0"})
        if r.status_code in (200, 206):
            return dict(r.headers)
        if r.status_code == 404:
            raise HTTPException(status_code=404, detail="File not found on storage server")
        raise HTTPException(status_code=502, detail=f"Storage server error: {r.status_code}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Storage connection failed: {str(e)}")


async def _process_download(paper_id: int):
    """
    Logic chung để tải file từ Submission Service dựa trên paper_id
    """
    sub_url = (SUBMISSION_SERVICE_URL or "").rstrip("/")
    if not sub_url:
        raise HTTPException(status_code=500, detail="SUBMISSION_SERVICE_URL is missing")

    timeout_meta = httpx.Timeout(10.0, read=20.0)
    timeout_file = httpx.Timeout(10.0, read=180.0)
    internal_headers = _build_internal_headers()

    # 1. Lấy metadata
    try:
        async with httpx.AsyncClient(timeout=timeout_meta, headers=internal_headers) as client:
            r = await client.get(f"{sub_url}/submissions/{paper_id}", follow_redirects=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Submission Service: {str(e)}")

    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="Paper not found in Submission Service")
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Submission Service error: {r.status_code}")

    data = r.json()
    versions = data.get("versions") or []
    if not versions:
        raise HTTPException(status_code=404, detail="No PDF version found for this paper")

    latest = max(versions, key=lambda v: v.get("version_number", 0))
    relative_path = _clean_relative_path(latest.get("file_url") or "")
    
    if not relative_path:
        raise HTTPException(status_code=404, detail="File path missing in metadata")

    download_url = f"{sub_url}/uploads/{relative_path}"

    # 2. Preflight check
    async with httpx.AsyncClient(timeout=timeout_meta) as client:
        headers_hint = await _preflight_file_exists(client, download_url)

    # 3. Stream file
    async def iterfile():
        async with httpx.AsyncClient(timeout=timeout_file) as client:
            async with client.stream("GET", download_url, follow_redirects=True) as resp:
                if resp.status_code != 200:
                    return
                async for chunk in resp.aiter_bytes():
                    yield chunk

    filename = f"Paper_{paper_id}_v{latest.get('version_number')}.pdf"
    out_headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    media_type = headers_hint.get("content-type") or "application/pdf"

    return StreamingResponse(iterfile(), media_type=media_type, headers=out_headers)


@router.get(
    "/{assignment_id}/download",
    dependencies=[Depends(require_roles(["REVIEWER", "CHAIR", "ADMIN"]))],
)
async def download_paper_via_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    payload=Depends(get_current_payload),
):
    """
    [REVIEWER] Download bài báo thông qua Assignment.
    """
    ass = crud.get_assignment(db, assignment_id)
    if not ass:
        raise HTTPException(status_code=404, detail="Assignment not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    # Reviewer chỉ được tải assignment của chính mình
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        if ass.reviewer_id != user_id:
            raise HTTPException(status_code=403, detail="Not your assignment")
            
    return await _process_download(ass.paper_id)


@router.get(
    "/paper/{paper_id}/download",
    dependencies=[Depends(require_roles(["CHAIR", "ADMIN"]))],
)
async def download_paper_direct(
    paper_id: int,
):
    """
    [CHAIR/ADMIN] Download bài báo trực tiếp bằng Paper ID.
    Dùng cho màn hình phân công (Split View) hoặc quản lý bài báo.
    """
    return await _process_download(paper_id)