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
    file_url bên submission thường: papers/10/v1/paper.pdf
    nhưng đôi lúc có thể: /papers/... hoặc uploads/papers/...
    => chuẩn hoá về papers/...
    """
    if not p:
        return ""
    s = str(p).strip()
    s = s.lstrip("/")
    if s.startswith("uploads/"):
        s = s[len("uploads/") :]
    return s


async def _preflight_file_exists(client: httpx.AsyncClient, url: str) -> dict:
    """
    Kiểm tra file tồn tại trước khi stream để tránh raise trong generator (gây 502 qua nginx).
    Trả về headers nếu có.
    """
    # HEAD nhanh nhất (nhưng có server không hỗ trợ)
    try:
        r = await client.head(url, follow_redirects=True)
        if r.status_code == 200:
            return dict(r.headers)
        if r.status_code == 404:
            raise HTTPException(status_code=404, detail="File not found on storage server")
        if r.status_code not in (405,):
            raise HTTPException(status_code=502, detail=f"Storage server error (HEAD): {r.status_code}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Storage preflight failed (HEAD): {str(e)}")

    # fallback: GET Range 0-0 (nhiều static server hỗ trợ)
    try:
        r = await client.get(url, follow_redirects=True, headers={"Range": "bytes=0-0"})
        if r.status_code in (200, 206):
            return dict(r.headers)
        if r.status_code == 404:
            raise HTTPException(status_code=404, detail="File not found on storage server")
        raise HTTPException(status_code=502, detail=f"Storage server error (Range GET): {r.status_code}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Storage preflight failed (Range GET): {str(e)}")


def _build_internal_headers() -> dict:
    """
    Header dùng cho service-to-service.
    """
    headers = {}
    if INTERNAL_KEY:
        headers["x-internal-key"] = INTERNAL_KEY
    return headers


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
    ass = crud.get_assignment(db, assignment_id)
    if not ass:
        raise HTTPException(status_code=404, detail="Assignment not found")

    roles = set(payload.get("roles") or [])
    user_id = payload.get("user_id")

    # Reviewer chỉ được tải assignment của mình (trừ Admin/Chair)
    if "REVIEWER" in roles and "ADMIN" not in roles and "CHAIR" not in roles:
        if ass.reviewer_id != user_id:
            raise HTTPException(status_code=403, detail="Not your assignment")

    sub_url = (SUBMISSION_SERVICE_URL or "").rstrip("/")
    if not sub_url:
        raise HTTPException(status_code=500, detail="SUBMISSION_SERVICE_URL is missing")

    # timeout metadata ngắn, timeout file dài
    timeout_meta = httpx.Timeout(connect=10.0, read=20.0, write=20.0, pool=20.0)
    timeout_file = httpx.Timeout(connect=10.0, read=180.0, write=180.0, pool=180.0)

    internal_headers = _build_internal_headers()

    # 1) lấy metadata paper từ submission-service (kèm x-internal-key)
    try:
        async with httpx.AsyncClient(timeout=timeout_meta, headers=internal_headers) as client:
            r = await client.get(f"{sub_url}/submissions/{ass.paper_id}", follow_redirects=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Submission Service: {str(e)}")

    if r.status_code != 200:
        # Trả message rõ để biết upstream đang trả gì
        raise HTTPException(
            status_code=502,
            detail=f"Cannot fetch paper metadata from submission-service: {r.status_code} {r.text}",
        )

    data = r.json()
    versions = data.get("versions") or []
    if not versions:
        raise HTTPException(status_code=404, detail="No PDF version found for this paper")

    latest = max(versions, key=lambda v: v.get("version_number", 0))
    relative_path = _clean_relative_path(latest.get("file_url") or "")
    if not relative_path:
        raise HTTPException(status_code=404, detail="File path missing in metadata")

    # Lưu ý: submission-service mount StaticFiles ở /uploads
    download_url = f"{sub_url}/uploads/{relative_path}"

    # 2) Preflight trước khi stream để tránh 502 phát sinh trong generator
    async with httpx.AsyncClient(timeout=timeout_meta) as client:
        headers_hint = await _preflight_file_exists(client, download_url)

    async def iterfile():
        # generator chỉ yield bytes, không raise HTTPException
        async with httpx.AsyncClient(timeout=timeout_file) as client:
            async with client.stream("GET", download_url, follow_redirects=True) as resp:
                if resp.status_code != 200:
                    # tránh throw trong generator
                    return
                async for chunk in resp.aiter_bytes():
                    yield chunk

    filename = f"Paper_{ass.paper_id}_v{latest.get('version_number')}.pdf"
    out_headers = {"Content-Disposition": f'attachment; filename="{filename}"'}

    ct = headers_hint.get("content-type") or headers_hint.get("Content-Type")
    media_type = ct if ct else "application/pdf"

    return StreamingResponse(iterfile(), media_type=media_type, headers=out_headers)