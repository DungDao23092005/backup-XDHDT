from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TrackBase(BaseModel):
    name: str
    description: Optional[str] = None


class TrackCreate(TrackBase):
    conference_id: int
    name: str
    description: Optional[str] = None


class TrackUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TrackResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    conference_id: int
    logo: str | None
    created_at: datetime

    class Config:
        from_attributes = True
