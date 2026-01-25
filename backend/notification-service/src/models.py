from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum
from datetime import datetime
import enum
from .database import Base



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
