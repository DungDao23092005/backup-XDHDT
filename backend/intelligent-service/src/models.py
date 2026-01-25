from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON
from datetime import datetime
from .database import Base

class AILog(Base):
    __tablename__ = "ai_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Thông tin người gọi
    user_id = Column(Integer, nullable=True)
    user_role = Column(String(50))
    
    # Thông tin kỹ thuật AI
    feature_type = Column(String(50))            # VD: REFINE_TEXT, MATCHING
    model_name = Column(String(50))              # VD: gemini-1.5-flash
    
    # Nội dung
    input_prompt = Column(Text)                  # Prompt gửi đi
    output_response = Column(JSON)               # Kết quả trả về 
    
    # Hiệu năng
    processing_time = Column(Float)              # Giây
    created_at = Column(DateTime, default=datetime.utcnow)