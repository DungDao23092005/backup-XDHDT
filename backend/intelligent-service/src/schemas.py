from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class AIResponseBase(BaseModel):
    processing_time: float

# --- 1. Feature: Author Refine Text ---
class RefineRequest(BaseModel):
    text: str
    type: str  # 'ABSTRACT' hoặc 'TITLE'

class RefineResponse(BaseModel):
    original_text: str
    refined_text: str
    changes: List[str]       # Danh sách các lỗi đã sửa
    keywords: List[str]      # Từ khóa gợi ý

# --- 2. Feature: Reviewer Analysis ---
class AnalyzeRequest(BaseModel):
    abstract_text: str

class AnalyzeResponse(BaseModel):
    neutral_summary: str     # Tóm tắt trung lập
    key_points: Dict[str, List[str]] # Trích xuất {claims: [], methods: []}

# --- 3. Feature: Chair Match Reviewer ---
class ReviewerCandidate(BaseModel):
    id: int
    name: str
    expertise: str # Bio hoặc danh sách keyword

class MatchRequest(BaseModel):
    paper_abstract: str
    candidates: List[ReviewerCandidate]

class MatchResult(BaseModel):
    reviewer_id: int
    name: str
    score: int         # 0-100
    reason: str        # Lý do khớp

# --- 4. Feature: Chair Email Draft ---
class EmailDraftRequest(BaseModel):
    decision: str      # ACCEPT / REJECT / REVISION
    author_name: str
    paper_title: str
    comments: Optional[str] = None

class EmailDraftResponse(BaseModel):
    subject: str
    body: str