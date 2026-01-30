from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from .models import EmailStatus

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

    
class DeviceCreate(BaseModel):
    fcm_token: str
    device_type: Optional[str] = "web"

class DeviceResponse(BaseModel):
    message: str