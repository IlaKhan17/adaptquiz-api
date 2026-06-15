import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    quiz_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("quizzes.id"), nullable=False
    )
    session_id: Mapped[str] = mapped_column(
        String(36), unique=True, index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user: Mapped["User"] = relationship("User", back_populates="sessions")  # type: ignore[name-defined]
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="sessions")  # type: ignore[name-defined]
    answers: Mapped[list["Answer"]] = relationship(
        "Answer", back_populates="session", cascade="all, delete-orphan"
    )


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("quiz_sessions.id"), nullable=False, index=True
    )
    question_id: Mapped[str] = mapped_column(String(36), nullable=False)
    student_answer: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    score_percentage: Mapped[int] = mapped_column(Integer, default=0)
    rubric_feedback: Mapped[list] = mapped_column(JSON, default=list)
    correct_answer: Mapped[str] = mapped_column(Text, default="")
    detailed_explanation: Mapped[str] = mapped_column(Text, default="")
    improvement_tip: Mapped[str] = mapped_column(Text, default="")
    knowledge_gap_tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    session: Mapped["QuizSession"] = relationship("QuizSession", back_populates="answers")
