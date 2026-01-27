from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy.dialects.mysql import JSON
from .database import Base
import enum

# 1. Định nghĩa Enum trạng thái bài báo
class PaperStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"         # Đã nộp
    UNDER_REVIEW = "UNDER_REVIEW"   # Đang phản biện
    ACCEPTED = "ACCEPTED"           # Được chấp nhận
    REJECTED = "REJECTED"           # Bị từ chối
    REVISION_REQUIRED = "REVISION_REQUIRED" # Cần sửa chữa 
    WITHDRAWN = "WITHDRAWN" # rút bài

# 2. Bảng chính: Bài báo (Papers)
class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    abstract = Column(Text, nullable=False)
    keywords = Column(JSON, nullable=False, default=list, comment="Từ khóa bài báo")

    # Các ID liên kết logic (Foreign Key logic)
    conference_id = Column(Integer, nullable=False)
    track_id = Column(Integer, nullable=False)
    submitter_id = Column(Integer, nullable=False) # ID người nộp (User ID)

    is_blind_mode = Column(Boolean, default=True) # Chế độ ẩn danh
    status = Column(Enum(PaperStatus), default=PaperStatus.SUBMITTED)

    decision_note = Column(Text, nullable=True)

    submitted_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 1 paper có nhiều versions (phiên bản file)
    versions = relationship("PaperVersion", back_populates="paper", cascade="all, delete-orphan")
    
    # 1 paper có nhiều authors (tác giả)
    authors = relationship("PaperAuthor", back_populates="paper", cascade="all, delete-orphan")
    
    # 1 paper thuộc nhiều topics (chủ đề)
    topics = relationship("PaperTopic", back_populates="paper", cascade="all, delete-orphan")


# 3. Bảng Tác giả (Paper Authors)
class PaperAuthor(Base):
    __tablename__ = "paper_authors"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=False)

    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    organization = Column(String(255), nullable=True)

    is_corresponding = Column(Boolean, default=False) # Là tác giả liên hệ chính?
    user_id = Column(Integer, nullable=True) # Có thể null nếu tác giả đó chưa có tài khoản hệ thống

    paper = relationship("Paper", back_populates="authors")


# 4. Bảng Phiên bản file (Paper Versions)
class PaperVersion(Base):
    __tablename__ = "paper_versions"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=False)

    version_number = Column(Integer, nullable=False) # v1, v2, v3...
    file_url = Column(String(500), nullable=False)   # Đường dẫn file PDF
    
    created_at = Column(DateTime, default=datetime.utcnow)
    is_camera_ready = Column(Boolean, default=False) # Bản chốt để in kỷ yếu?
    is_anonymous = Column(Boolean, default=True)     # File này có ẩn danh tên tác giả không?

    paper = relationship("Paper", back_populates="versions")


# 5. Bảng Chủ đề bài báo (Paper Topics)
class PaperTopic(Base):
    __tablename__ = "paper_topics"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=False)
    topic_id = Column(Integer, nullable=False)

    paper = relationship("Paper", back_populates="topics")


