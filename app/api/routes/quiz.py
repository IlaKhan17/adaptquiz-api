from fastapi import APIRouter, HTTPException

from app.schemas.quiz import QuizGenerateRequest, QuizResponse
from app.services.quiz_service import generate_quiz, quiz_sessions

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("/generate", response_model=QuizResponse, status_code=201)
async def generate_quiz_endpoint(request: QuizGenerateRequest) -> QuizResponse:
    """
    Generate an adaptive quiz from a previously ingested document.

    - **doc_id**: Document identifier returned by the `/ingest` endpoint.
    - **topic**: Optional topic filter — narrows retrieval to relevant chunks.
    - **difficulty**: `easy` | `medium` | `hard` (default: `medium`).
    - **question_types**: List of formats to include — `mcq`, `short_answer`,
      `true_false`, `fill_blank` (default: `[mcq, short_answer]`).
    - **num_questions**: Number of questions to generate, 1–15 (default: `5`).

    Returns a `QuizResponse` containing the questions and a `session_id` to use
    when submitting answers to `/eval/answer`.
    """
    try:
        return await generate_quiz(request)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Quiz generation failed — the AI model returned an unexpected response. "
                   "Please try again.",
        ) from exc


@router.get("/{quiz_id}", response_model=QuizResponse)
def get_quiz(quiz_id: str) -> QuizResponse:
    """
    Retrieve a previously generated quiz by its `quiz_id`.

    Returns the full `QuizResponse` including all questions and the `session_id`.
    Raises **404** if the quiz is not found in the current session store.
    """
    for session_id, session in quiz_sessions.items():
        if session["quiz_id"] == quiz_id:
            return QuizResponse(
                quiz_id=quiz_id,
                doc_id=session["doc_id"],
                topic=session["topic"],
                difficulty=session["difficulty"],
                questions=session["questions"],
                total_questions=len(session["questions"]),
                session_id=session_id,
            )

    raise HTTPException(
        status_code=404,
        detail=f"Quiz '{quiz_id}' not found.",
    )
