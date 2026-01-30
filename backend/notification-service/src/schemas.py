from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
from src.models import EmailStatus

class NotificationRequest(BaseModel):
    receiver_id: int          
    receiver_email: Optional[EmailStr] = None
    receiver_name: Optional[str] = None 
    
    paper_id: Optional[int] = None 
    paper_title: Optional[str] = None
    
    subject: str             
    body: str               

class MessageResponse(BaseModel):
    id: int
    subject: str
    body: str
    is_read: bool
    created_at: datetime
    
    paper_id: Optional[int] = None 

    class Config:
        from_attributes = True


class EmailLogResponse(BaseModel):
    id: int
    recipient_email: str
    subject: str
    status: EmailStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReviewerInviteRequest(BaseModel):
    conference_id: int
    reviewer_email: EmailStr
    reviewer_name: str
    description: str
    
class DeviceCreate(BaseModel):
    fcm_token: str
    device_type: Optional[str] = "web"

class DeviceResponse(BaseModel):
    message: str
class ReviewerInvitationResponse(BaseModel):
    id: int
    conference_id: int
    conference_name: str
    reviewer_name: str
    reviewer_email: str
    status: str

    model_config = ConfigDict(from_attributes=True)
    
