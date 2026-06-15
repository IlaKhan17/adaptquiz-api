from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.quiz import QuizResponse
from app.schemas.session import SessionReport
from app.services.quiz_service import get_session_quiz
from app.services.session_service import get_session_report, list_user_sessions

router = APIRouter(prefix="/session", tags=["session"])


@router.get("", response_model=list[dict])
async def get_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List all quiz sessions for the current user."""
    return await list_user_sessions(current_user.id, db)


@router.get("/{session_id}/quiz", response_model=QuizResponse)
async def get_quiz_for_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizResponse:
    """Retrieve the quiz questions for an existing session."""
    return await get_session_quiz(session_id, current_user.id, db)


@router.get("/{session_id}/report", response_model=SessionReport)
async def session_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionReport:
    """Retrieve the performance report for a quiz session."""
    return await get_session_report(session_id, current_user.id, db)
