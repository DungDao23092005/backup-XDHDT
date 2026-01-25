from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from enum import Enum


class PaperStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"

# Tác giả của bài báo
class PaperAuthorCreate(BaseModel):
    full_name: str
    email: EmailStr
    organization: Optional[str] = None
    is_corresponding: bool = False
    user_id: Optional[int] = None


class PaperAuthorResponse(PaperAuthorCreate):
    id: int
    full_name: str
    email: EmailStr
    organization: Optional[str]
    is_corresponding: bool
    user_id: Optional[int]

    class Config:
        from_attributes = True


# Chủ đề của bài báo
class PaperTopicCreate(BaseModel):
    topic_id: int


class PaperTopicResponse(PaperTopicCreate):
    id: int
    topic_id: int

    class Config:
        from_attributes = True


# Phiên bản của bài báo
class PaperVersionResponse(BaseModel):
    id: int
    paper_id: int
    version_number: int
    file_url: str
    created_at: datetime
    
    is_camera_ready: bool
    is_anonymous: bool

    class Config:
        from_attributes = True

# Bài báo
class PaperBase(BaseModel):
    title: str
    abstract: str
    keywords: Optional[str] = None
    conference_id: int
    track_id: int
    is_blind_mode: bool = True

class PaperCreate(PaperBase):
    authors: List[PaperAuthorCreate]
    topics: List[PaperTopicCreate]

class PaperResponse(PaperBase):
    id: int
    submitter_id: int
    status: PaperStatus

    decision_note: Optional[str] = None     
    
    submitted_at: datetime
    created_at: datetime

    authors: List[PaperAuthorResponse]
    topics: List[PaperTopicResponse]
    versions: List[PaperVersionResponse]

    class Config:
        from_attributes = True

# Thông điệp phản hồi chung
class MessageResponse(BaseModel):
    message: str

# Thêm đồng giả
class AuthorAdd(BaseModel):
    full_name: str
    email: EmailStr
    organization: Optional[str] = None
    is_corresponding: bool = False
    user_id: Optional[int] = None

class AuthorResponse(AuthorAdd):
    id: int
    paper_id: int

    class Config:
        from_attributes = True


class PaperTopicInput(BaseModel):
    topic_id: int

class PaperUpdate(BaseModel):
    title: Optional[str] = None
    abstract: Optional[str] = None
    keywords: Optional[str] = None

    topics: Optional[List[PaperTopicInput]] = None

class ConferenceExternalInfo(BaseModel):
    id: int
    name: str
    submission_deadline: Optional[datetime] = None


class PaperDecision(BaseModel):
    status: PaperStatus
    note: Optional[str] = None