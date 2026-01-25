from pydantic import BaseModel
from typing import Optional

# request
class TopicCreate(BaseModel):
    name: str
    description: Optional[str] = None
    track_id: int

class TopicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

# response
class TopicResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    track_id: int
    conference_id: int   # lấy từ track

    class Config:
        from_attributes = True
