from sqlalchemy import Column, Integer, String, Text
from src.database import Base

class Conference(Base):
    __tablename__ = "conferences"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    logo = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, nullable=False)
