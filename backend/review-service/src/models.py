from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    Float,
    Text,
    Enum,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from src.database import Base

# =========================================================
# ENUM DEFINITIONS (Chuẩn MySQL)
# =========================================================

class AssignmentStatus(str, enum.Enum):
    INVITED = "Invited"
    ACCEPTED = "Accepted"
    DECLINED = "Declined"
    COMPLETED = "Completed"
    COI = "COI"


class ConflictType(str, enum.Enum):
    MANUAL_DECLARED = "Manual_Declared"
    DETECTED_ORGANIZATION = "Detected_Organization"
    OTHER = "Other"


class ConflictStatus(str, enum.Enum):
    OPEN = "Open"
    RESOLVED = "Resolved"


# =========================================================
# ASSIGNMENTS
# =========================================================

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)

    reviewer_id = Column(Integer, nullable=False, index=True)
    paper_id = Column(Integer, nullable=False, index=True)

    status = Column(
        Enum(AssignmentStatus),
        nullable=False,
        default=AssignmentStatus.INVITED,
    )

    is_manual = Column(Boolean, default=False)

    due_date = Column(DateTime, nullable=True)
    response_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    reviews = relationship(
        "Review",
        back_populates="assignment",
        cascade="all, delete-orphan",
    )


# =========================================================
# REVIEWS
# =========================================================

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)

    assignment_id = Column(
        Integer,
        ForeignKey("assignments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    final_score = Column(Float, nullable=True)
    confidence_score = Column(Integer, nullable=True)

    content_author = Column(Text, nullable=True)
    content_pc = Column(Text, nullable=True)

    is_anonymous = Column(Boolean, default=True)
    is_draft = Column(Boolean, default=True)

    submitted_at = Column(DateTime, nullable=True)

    assignment = relationship(
        "Assignment",
        back_populates="reviews",
    )

    criterias = relationship(
        "ReviewCriteria",
        back_populates="review",
        cascade="all, delete-orphan",
    )


# =========================================================
# REVIEW CRITERIAS
# =========================================================

class ReviewCriteria(Base):
    __tablename__ = "review_criterias"

    id = Column(Integer, primary_key=True, index=True)

    review_id = Column(
        Integer,
        ForeignKey("reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    criteria_name = Column(String(100), nullable=False)
    grade = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    comment = Column(Text, nullable=True)

    review = relationship(
        "Review",
        back_populates="criterias",
    )


# =========================================================
# CONFLICTS OF INTEREST
# =========================================================

class ConflictOfInterest(Base):
    __tablename__ = "conflicts_of_interest"

    id = Column(Integer, primary_key=True, index=True)

    paper_id = Column(Integer, nullable=False, index=True)
    reviewer_id = Column(Integer, nullable=False, index=True)

    type = Column(
        Enum(ConflictType),
        nullable=False,
        default=ConflictType.MANUAL_DECLARED,
    )

    description = Column(String(500), nullable=True)

    status = Column(
        Enum(ConflictStatus),
        nullable=False,
        default=ConflictStatus.OPEN,
    )

    created_at = Column(DateTime, default=datetime.utcnow)


# =========================================================
# REVIEW DISCUSSIONS
# =========================================================

class ReviewDiscussion(Base):
    __tablename__ = "review_discussions"

    id = Column(Integer, primary_key=True, index=True)

    paper_id = Column(Integer, nullable=False, index=True)
    sender_id = Column(Integer, nullable=False, index=True)

    content = Column(Text, nullable=False)

    sent_at = Column(DateTime, default=datetime.utcnow)

    parent_id = Column(Integer, nullable=True)
