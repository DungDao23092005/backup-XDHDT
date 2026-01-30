import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# 👇 Sửa import cho khớp với cấu trúc thư mục của bạn
# (Dùng dấu chấm . để import tương đối từ thư mục services cùng cấp)
from .services.ai_reviewer import ai_service

router = APIRouter(prefix="/api/intelligent/papers", tags=["AI Analysis"])

# Cấu hình URL của Submission Service
SUBMISSION_SERVICE_URL = os.getenv("SUBMISSION_SERVICE_URL", "http://submission-service:8000")

class AnalysisResponse(BaseModel):
    paper_id: int
    synopsis: str
    key_points: list[str]

@router.get("/{paper_id}/analyze", response_model=AnalysisResponse)
def analyze_paper(paper_id: int):
    """
    API gọi sang Submission Service lấy Abstract, sau đó nhờ AI phân tích.
    """
    try:
        # Gọi Submission Service
        resp = requests.get(f"{SUBMISSION_SERVICE_URL}/submissions/{paper_id}", timeout=5)
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="Paper not found in Submission Service")
        
        paper_data = resp.json()
        title = paper_data.get("title", "Untitled")
        abstract = paper_data.get("abstract", "")
        
        if not abstract:
             return {
                "paper_id": paper_id,
                "synopsis": "Bài báo này không có tóm tắt (abstract) để phân tích.",
                "key_points": []
            }

    except Exception as e:
        print(f"Error fetching paper: {e}")
        # Fallback data để test
        title = "Test Paper Title"
        abstract = "This is a test abstract."

    # Gọi AI Service
    ai_result = ai_service.analyze_paper_abstract(title, abstract)

    return {
        "paper_id": paper_id,
        "synopsis": ai_result["synopsis"],
        "key_points": ai_result["key_points"]
    }