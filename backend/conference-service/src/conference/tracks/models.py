from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from src.database import Base
from sqlalchemy.sql import func

class Track(Base):
    __tablename__ = "tracks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)

    description = Column(Text, nullable=True)  # ✅ THÊM DÒNG NÀY

    logo = Column(String(255), nullable=True)

    conference_id = Column(
        Integer,
        ForeignKey("conferences.id", ondelete="CASCADE"),
        nullable=False
    )

    description = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conference = relationship(
    "Conference",
    back_populates="tracks"
)

    topics = relationship(
    "Topic",
    back_populates="track",
    cascade="all, delete"
)
