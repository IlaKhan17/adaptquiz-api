from fastapi import APIRouter

from app.schemas.session import SessionReport
from app.services.session_service import get_session_report

router = APIRouter(prefix="/session", tags=["session"])


@router.get("/{session_id}/report", response_model=SessionReport)
def session_report(session_id: str) -> SessionReport:
    """
    Retrieve the performance report for a completed or in-progress quiz session.

    - **session_id**: Session identifier returned by `/quiz/generate`.

    Returns a `SessionReport` with overall score, letter grade, per-question
    breakdown, identified knowledge gaps (top 5 by frequency), and a
    personalised study recommendation.
    """
    return get_session_report(session_id)
