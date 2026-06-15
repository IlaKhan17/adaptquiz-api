from collections import Counter

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quiz import Question as DBQuestion
from app.models.quiz import Quiz
from app.models.session_model import Answer, QuizSession
from app.schemas.session import SessionReport

_TOP_GAPS = 5


async def get_session_report(
    session_id: str,
    user_id: str,
    db: AsyncSession,
) -> SessionReport:
    session = (
        await db.execute(
            select(QuizSession).where(
                QuizSession.session_id == session_id,
                QuizSession.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    questions = (
        await db.execute(select(DBQuestion).where(DBQuestion.quiz_id == session.quiz_id))
    ).scalars().all()

    answers = (
        await db.execute(select(Answer).where(Answer.session_id == session.id))
    ).scalars().all()
    answers_by_qid = {a.question_id: a for a in answers}

    answered = len(answers)
    overall_score = sum(a.score for a in answers) / answered if answered else 0.0
    grade = _score_to_grade(overall_score)

    gap_counter: Counter = Counter()
    for answer in answers:
        gap_counter.update(answer.knowledge_gap_tags or [])

    knowledge_gaps = [
        {"topic": tag, "frequency": count}
        for tag, count in gap_counter.most_common(_TOP_GAPS)
    ]

    return SessionReport(
        session_id=session_id,
        total_questions=len(questions),
        answered=answered,
        overall_score=round(overall_score, 2),
        grade=grade,
        knowledge_gaps=knowledge_gaps,
        recommendation=_build_recommendation(overall_score, knowledge_gaps),
        question_breakdown=[
            {
                "question_id": q.question_id,
                "question_text": q.question_text,
                "topic_tag": q.topic_tag,
                "is_correct": answers_by_qid[q.question_id].is_correct
                if q.question_id in answers_by_qid else None,
                "score": answers_by_qid[q.question_id].score
                if q.question_id in answers_by_qid else None,
                "student_answer": answers_by_qid[q.question_id].student_answer
                if q.question_id in answers_by_qid else None,
                "correct_answer": answers_by_qid[q.question_id].correct_answer
                if q.question_id in answers_by_qid else None,
                "detailed_explanation": answers_by_qid[q.question_id].detailed_explanation
                if q.question_id in answers_by_qid else None,
                "improvement_tip": answers_by_qid[q.question_id].improvement_tip
                if q.question_id in answers_by_qid else None,
                "rubric_feedback": answers_by_qid[q.question_id].rubric_feedback
                if q.question_id in answers_by_qid else None,
            }
            for q in questions
        ],
    )


async def list_user_sessions(user_id: str, db: AsyncSession) -> list[dict]:
    sessions = (
        await db.execute(
            select(QuizSession)
            .where(QuizSession.user_id == user_id)
            .order_by(QuizSession.created_at.desc())
        )
    ).scalars().all()

    items = []
    for s in sessions:
        quiz = (await db.execute(select(Quiz).where(Quiz.id == s.quiz_id))).scalar_one_or_none()
        answers = (await db.execute(select(Answer).where(Answer.session_id == s.id))).scalars().all()
        answered = len(answers)
        score = round(sum(a.score for a in answers) / answered, 2) if answered else None
        items.append({
            "session_id": s.session_id,
            "quiz_id": quiz.quiz_id if quiz else "",
            "topic": quiz.topic if quiz else None,
            "difficulty": quiz.difficulty if quiz else "",
            "total_questions": quiz.total_questions if quiz else 0,
            "answered": answered,
            "overall_score": score,
            "grade": _score_to_grade(score) if score is not None else None,
            "created_at": s.created_at.isoformat(),
        })
    return items


def _score_to_grade(score: float) -> str:
    if score >= 0.90:
        return "A+"
    if score >= 0.80:
        return "A"
    if score >= 0.70:
        return "B"
    if score >= 0.60:
        return "C"
    return "Needs Improvement"


def _build_recommendation(score: float, gaps: list[dict]) -> str:
    if score >= 0.90:
        base = "Excellent work! You have a strong grasp of the material."
    elif score >= 0.70:
        base = "Good progress. Review the areas below to solidify your understanding."
    elif score >= 0.50:
        base = "You are making progress but several key concepts need more attention."
    else:
        base = "Consider re-reading the study material thoroughly before retrying the quiz."

    if gaps:
        topics = ", ".join(g["topic"] for g in gaps)
        return f"{base} Focus your revision on: {topics}."
    return base
