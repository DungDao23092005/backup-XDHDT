# backend/notification-service/src/models.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func # [MỚI] Import để dùng server time
from datetime import datetime
import enum
from src.database import Base
from sqlalchemy.sql import func


class EmailStatus(str, enum.Enum):
    PENDING = "PENDING"  
    SENT = "SENT"      
    FAILED = "FAILED"

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, nullable=True)
    receiver_id = Column(Integer, nullable=False)
    receiver_email = Column(String(255), nullable=True)
    receiver_name = Column(String(255), nullable=True)
    
    paper_id = Column(Integer, nullable=True) 
    paper_title = Column(String(255), nullable=True)
    
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    
class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    
    status = Column(Enum(EmailStatus), default=EmailStatus.PENDING)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvitationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"

class ReviewerInvitation(Base):
    __tablename__ = "reviewer_invitations"

    id = Column(Integer, primary_key=True, index=True)
    conference_id = Column(Integer, nullable=True)
    conference_name = Column(String(255), nullable=True)
    reviewer_name = Column(String(255))
    reviewer_email = Column(String(255))
    description = Column(Text, nullable=True)
    status = Column(Enum(InvitationStatus), default=InvitationStatus.PENDING)
    token = Column(String(255), nullable=False)

class NotificationPrefs(Base):
    __tablename__ = "notification_prefs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, unique=True, index=True, nullable=False)
    deadline_reminder = Column(Boolean, default=True, nullable=False)

# [MỚI] Bảng lưu FCM Token của User (Web Push Notification)
class UserDevice(Base):
    __tablename__ = "user_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True) # ID của user từ Identity Service
    fcm_token = Column(String(500), nullable=False, unique=True) # Token dài, nên để 500
    device_type = Column(String(50), default="web") # web, android, ios
    
    # Dùng server_default=func.now() tốt hơn datetime.utcnow khi chạy nhiều instance
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
