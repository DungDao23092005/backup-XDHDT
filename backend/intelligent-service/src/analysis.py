import os
import requests
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .services.ai_reviewer import ai_service

# 👇 QUAN TRỌNG: Không set prefix ở đây để tránh bị lặp (thành /papers/papers/...)
router = APIRouter(tags=["AI Analysis"])

SUBMISSION_SERVICE_URL = os.getenv("SUBMISSION_SERVICE_URL", "http://submission-service:8000").rstrip("/")
INTERNAL_KEY = os.getenv("INTERNAL_KEY", "").strip()


class AnalysisResponse(BaseModel):
    paper_id: int
    synopsis: str
    key_points: list[str]


def fetch_paper(paper_id: int, auth_header: str | None) -> dict:
    url = f"{SUBMISSION_SERVICE_URL}/submissions/{paper_id}"

    headers = {}
    # Ưu tiên forward Authorization của user (để đảm bảo quyền truy cập)
    if auth_header:
        headers["Authorization"] = auth_header
    
    # Nếu không có token user mà có INTERNAL_KEY thì gửi internal header (tuỳ logic service đích)
    if INTERNAL_KEY:
        headers["X-Internal-Key"] = INTERNAL_KEY

    try:
        resp = requests.get(url, headers=headers, timeout=8)
    except requests.exceptions.RequestException as e:
         raise HTTPException(status_code=503, detail=f"Failed to connect to Submission Service: {str(e)}")

    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Unauthorized to Submission Service (missing/invalid token)")
    if resp.status_code == 403:
        raise HTTPException(status_code=403, detail="Forbidden by Submission Service (no permission)")
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Paper not found in Submission Service")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Submission Service error: {resp.status_code} {resp.text}")

    return resp.json()


@router.get("/{paper_id}/analyze", response_model=AnalysisResponse)
def analyze_paper(paper_id: int, request: Request):
    # Lấy Authorization từ request hiện tại để forward đi
    auth_header = request.headers.get("Authorization")

    # 1. Gọi Submission Service lấy dữ liệu bài báo
    paper_data = fetch_paper(paper_id, auth_header)

    title = paper_data.get("title") or "Untitled"
    abstract = paper_data.get("abstract") or ""

    # 2. Validate dữ liệu đầu vào
    if not abstract.strip():
        return {
            "paper_id": paper_id,
            "synopsis": "Bài báo này không có tóm tắt (abstract) để phân tích.",
            "key_points": [],
        }

    # 3. Gọi AI Engine để phân tích
    # (Đảm bảo ai_service.analyze_paper_abstract đã được implement và import đúng)
    ai_result = ai_service.analyze_paper_abstract(title, abstract)

    return {
        "paper_id": paper_id,
        "synopsis": ai_result.get("synopsis", "No synopsis generated"),
        "key_points": ai_result.get("key_points", []),
    }