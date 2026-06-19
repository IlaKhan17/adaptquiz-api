import json

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm import call_llm
from app.models.quiz import Question as DBQuestion
from app.models.session_model import Answer, QuizSession
from app.prompts.answer_eval import build_eval_prompt
from app.schemas.eval import AnswerEvalResponse, AnswerSubmitRequest, FeedbackItem


async def evaluate_answer(
    request: AnswerSubmitRequest,
    user_id: str,
    db: AsyncSession,
) -> AnswerEvalResponse:
    session = (
        await db.execute(
            select(QuizSession).where(
                QuizSession.session_id == request.session_id,
                QuizSession.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{request.session_id}' not found.")

    question = (
        await db.execute(
            select(DBQuestion).where(
                DBQuestion.quiz_id == session.quiz_id,
                DBQuestion.question_id == request.question_id,
            )
        )
    ).scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail=f"Question '{request.question_id}' not found.")

    # MCQ and True/False are objective — evaluate directly without LLM rubric
    if question.question_type == "mcq":
        eval_response = _evaluate_mcq(request, question)
    elif question.question_type == "true_false":
        eval_response = _evaluate_true_false(request, question)
    else:
        eval_response = await _evaluate_with_llm(request, question)

    await _save_answer(eval_response, request, question, session, db)
    return eval_response


def _evaluate_mcq(request: AnswerSubmitRequest, question: DBQuestion) -> AnswerEvalResponse:
    """Direct comparison: find the is_correct option and match against student's label."""
    options = question.options or []
    correct_opt = next((o for o in options if o.get("is_correct")), None)
    correct_label = (correct_opt["label"] if correct_opt else "").strip().upper()

    # Student sends the label letter ("A", "B", "C", "D")
    student_label = request.student_answer.strip().upper().rstrip(".")

    is_correct = student_label == correct_label
    score = 1.0 if is_correct else 0.0

    correct_text = (
        f"{correct_opt['label']}. {correct_opt['text']}" if correct_opt else question.correct_answer
    )

    if is_correct:
        accuracy_comment = f"Correct! You selected {correct_label}: {correct_opt['text'] if correct_opt else ''}".strip()
    else:
        student_opt = next((o for o in options if o.get("label", "").upper() == student_label), None)
        student_text = f" ({student_opt['text']})" if student_opt else ""
        accuracy_comment = (
            f"Incorrect. You chose {student_label}{student_text}. "
            f"The correct answer is {correct_label}: {correct_opt['text'] if correct_opt else ''}."
        ).strip()

    return AnswerEvalResponse(
        question_id=request.question_id,
        student_answer=request.student_answer,
        is_correct=is_correct,
        score=score,
        score_percentage=100 if is_correct else 0,
        rubric_feedback=[
            FeedbackItem(criterion="Accuracy", score=score, comment=accuracy_comment),
        ],
        correct_answer=correct_text,
        detailed_explanation=question.explanation,
        improvement_tip="" if is_correct else "Review this concept and try to understand why the other options are incorrect.",
        knowledge_gap_tags=[] if is_correct else ([question.topic_tag] if question.topic_tag else []),
    )


def _evaluate_true_false(request: AnswerSubmitRequest, question: DBQuestion) -> AnswerEvalResponse:
    """Direct comparison for True/False questions."""
    student = request.student_answer.strip().capitalize()
    correct = question.correct_answer.strip().capitalize()

    is_correct = student == correct
    score = 1.0 if is_correct else 0.0
    comment = (
        f"Correct. The statement is {correct}."
        if is_correct
        else f"Incorrect. You answered {student} but the statement is {correct}."
    )

    return AnswerEvalResponse(
        question_id=request.question_id,
        student_answer=request.student_answer,
        is_correct=is_correct,
        score=score,
        score_percentage=100 if is_correct else 0,
        rubric_feedback=[
            FeedbackItem(criterion="Accuracy", score=score, comment=comment),
        ],
        correct_answer=correct,
        detailed_explanation=question.explanation,
        improvement_tip="" if is_correct else f"Re-read the relevant section to understand why this statement is {correct}.",
        knowledge_gap_tags=[] if is_correct else ([question.topic_tag] if question.topic_tag else []),
    )


async def _evaluate_with_llm(
    request: AnswerSubmitRequest, question: DBQuestion
) -> AnswerEvalResponse:
    """LLM rubric evaluation for short_answer and fill_blank."""
    prompt = build_eval_prompt(
        question=question.question_text,
        question_type=question.question_type,
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

    return AnswerEvalResponse(
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


async def _save_answer(
    eval_response: AnswerEvalResponse,
    request: AnswerSubmitRequest,
    question: DBQuestion,
    session: QuizSession,
    db: AsyncSession,
) -> None:
    rubric_dicts = [f.model_dump() for f in eval_response.rubric_feedback]

    existing = (
        await db.execute(
            select(Answer).where(
                Answer.session_id == session.id,
                Answer.question_id == request.question_id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.student_answer = request.student_answer
        existing.is_correct = eval_response.is_correct
        existing.score = eval_response.score
        existing.score_percentage = eval_response.score_percentage
        existing.rubric_feedback = rubric_dicts
        existing.correct_answer = eval_response.correct_answer
        existing.detailed_explanation = eval_response.detailed_explanation
        existing.improvement_tip = eval_response.improvement_tip
        existing.knowledge_gap_tags = eval_response.knowledge_gap_tags
    else:
        db.add(
            Answer(
                session_id=session.id,
                question_id=request.question_id,
                student_answer=request.student_answer,
                is_correct=eval_response.is_correct,
                score=eval_response.score,
                score_percentage=eval_response.score_percentage,
                rubric_feedback=rubric_dicts,
                correct_answer=eval_response.correct_answer,
                detailed_explanation=eval_response.detailed_explanation,
                improvement_tip=eval_response.improvement_tip,
                knowledge_gap_tags=eval_response.knowledge_gap_tags,
            )
        )
    await db.commit()
