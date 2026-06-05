import json

from fastapi import HTTPException

from app.core.llm import call_llm
from app.prompts.answer_eval import build_eval_prompt
from app.schemas.eval import AnswerEvalResponse, AnswerSubmitRequest, FeedbackItem
from app.services.quiz_service import quiz_sessions


async def evaluate_answer(request: AnswerSubmitRequest) -> AnswerEvalResponse:
    session = quiz_sessions.get(request.session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{request.session_id}' not found.",
        )

    question = next(
        (q for q in session["questions"] if q.question_id == request.question_id),
        None,
    )
    if question is None:
        raise HTTPException(
            status_code=404,
            detail=f"Question '{request.question_id}' not found in session '{request.session_id}'.",
        )

    prompt = build_eval_prompt(
        question=question.question_text,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        student_answer=request.student_answer,
    )

    raw = await call_llm(prompt, temperature=0.1)
    data = json.loads(raw)

    rubric_feedback = [
        FeedbackItem(
            criterion=item.get("criterion", ""),
            score=float(item.get("score", 0.0)),
            comment=item.get("comment", ""),
        )
        for item in data.get("rubric_feedback", [])
    ]

    result = AnswerEvalResponse(
        question_id=request.question_id,
        student_answer=request.student_answer,
        is_correct=bool(data.get("is_correct", False)),
        score=float(data.get("score", 0.0)),
        score_percentage=int(data.get("score_percentage", 0)),
        rubric_feedback=rubric_feedback,
        correct_answer=question.correct_answer,
        detailed_explanation=data.get("detailed_explanation", ""),
        improvement_tip=data.get("improvement_tip", ""),
        knowledge_gap_tags=data.get("knowledge_gap_tags", []),
    )

    session["answers"][request.question_id] = result
    return result
