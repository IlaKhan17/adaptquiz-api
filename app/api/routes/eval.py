from fastapi import APIRouter

from app.schemas.eval import AnswerEvalResponse, AnswerSubmitRequest
from app.services.eval_service import evaluate_answer

router = APIRouter(prefix="/eval", tags=["eval"])


@router.post("/answer", response_model=AnswerEvalResponse)
async def submit_answer(request: AnswerSubmitRequest) -> AnswerEvalResponse:
    """
    Submit a student answer for AI grading.

    - **session_id**: Session identifier from the `/quiz/generate` response.
    - **question_id**: The `question_id` of the question being answered.
    - **student_answer**: The student's free-text answer.

    The answer is evaluated across three rubric criteria — **Accuracy**,
    **Completeness**, and **Terminology** — with partial credit where appropriate.

    Returns a detailed `AnswerEvalResponse` including per-criterion feedback,
    an overall score, improvement tips, and knowledge gap tags.
    """
    return await evaluate_answer(request)
