from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ---------- Assignments ----------
class AssignmentCreate(BaseModel):
    reviewer_id: int
    paper_id: int
    is_manual: bool = False
    due_date: Optional[datetime] = None

class AssignmentUpdate(BaseModel):
    status: Optional[str] = None
    response_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    is_manual: Optional[bool] = None

class AssignmentOut(BaseModel):
    id: int
    reviewer_id: int
    paper_id: int
    status: str
    is_manual: bool
    due_date: Optional[datetime]
    response_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

# ---------- Reviews ----------
class ReviewCreate(BaseModel):
    assignment_id: int
    final_score: Optional[float] = None
    confidence_score: Optional[int] = Field(default=None, ge=1, le=5)
    content_author: Optional[str] = None
    content_pc: Optional[str] = None
    is_anonymous: bool = True
    is_draft: bool = True

class ReviewUpdate(BaseModel):
    final_score: Optional[float] = None
    confidence_score: Optional[int] = Field(default=None, ge=1, le=5)
    content_author: Optional[str] = None
    content_pc: Optional[str] = None
    is_anonymous: Optional[bool] = None
    is_draft: Optional[bool] = None
    submitted_at: Optional[datetime] = None

class ReviewCriteriaCreate(BaseModel):
    criteria_name: str
    grade: Optional[int] = None
    weight: Optional[float] = None
    comment: Optional[str] = None

class ReviewCriteriaUpdate(BaseModel):
    criteria_name: Optional[str] = None
    grade: Optional[int] = None
    weight: Optional[float] = None
    comment: Optional[str] = None

class ReviewCriteriaOut(BaseModel):
    id: int
    review_id: int
    criteria_name: str
    grade: Optional[int]
    weight: Optional[float]
    comment: Optional[str]

    class Config:
        from_attributes = True

class ReviewOut(BaseModel):
    id: int
    assignment_id: int
    final_score: Optional[float]
    confidence_score: Optional[int]
    content_author: Optional[str]
    content_pc: Optional[str]
    is_anonymous: bool
    is_draft: bool
    submitted_at: Optional[datetime]
    criterias: List[ReviewCriteriaOut] = []

    class Config:
        from_attributes = True

# ---------- COI ----------
class COICreate(BaseModel):
    paper_id: int
    reviewer_id: int
    type: str = "Manual_Declared"
    description: Optional[str] = None

class COIUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None

class COIOut(BaseModel):
    id: int
    paper_id: int
    reviewer_id: int
    type: str
    description: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# ---------- Discussions ----------
class DiscussionCreate(BaseModel):
    paper_id: int
    content: str
    parent_id: Optional[int] = None

class DiscussionOut(BaseModel):
    id: int
    paper_id: int
    sender_id: int
    content: str
    sent_at: datetime
    parent_id: Optional[int]

    class Config:
        from_attributes = True
