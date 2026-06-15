from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.eval import AnswerEvalResponse, AnswerSubmitRequest
from app.services.eval_service import evaluate_answer

router = APIRouter(prefix="/eval", tags=["eval"])


@router.post("/answer", response_model=AnswerEvalResponse)
async def submit_answer(
    request: AnswerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnswerEvalResponse:
    """Submit a student answer for AI grading with rubric-based partial credit."""
    return await evaluate_answer(request, current_user.id, db)
