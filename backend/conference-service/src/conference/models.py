from sqlalchemy import Column, Integer, String, Text
from src.database import Base
from sqlalchemy.orm import relationship
from sqlalchemy import DateTime
class Conference(Base):
    __tablename__ = "conferences"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    logo = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, nullable=False)  # user_id từ identity-service
    logo = Column(String(255))
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    tracks = relationship(
    "Track",
    back_populates="conference",
    cascade="all, delete"
)
