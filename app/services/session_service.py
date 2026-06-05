from collections import Counter

from fastapi import HTTPException

from app.schemas.session import SessionReport
from app.services.quiz_service import quiz_sessions

_TOP_GAPS = 5


def get_session_report(session_id: str) -> SessionReport:
    session = quiz_sessions.get(session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{session_id}' not found.",
        )

    answers = session["answers"]
    total_questions = len(session["questions"])
    answered = len(answers)

    overall_score = (
        sum(a.score for a in answers.values()) / answered if answered else 0.0
    )

    grade = _score_to_grade(overall_score)

    gap_counter: Counter = Counter()
    for answer in answers.values():
        gap_counter.update(answer.knowledge_gap_tags)

    knowledge_gaps = [
        {"topic": tag, "frequency": count}
        for tag, count in gap_counter.most_common(_TOP_GAPS)
    ]

    recommendation = _build_recommendation(overall_score, knowledge_gaps)

    question_breakdown = [
        {
            "question_id": q.question_id,
            "question_text": q.question_text,
            "topic_tag": q.topic_tag,
            "is_correct": answers[q.question_id].is_correct if q.question_id in answers else None,
            "score": answers[q.question_id].score if q.question_id in answers else None,
        }
        for q in session["questions"]
    ]

    return SessionReport(
        session_id=session_id,
        total_questions=total_questions,
        answered=answered,
        overall_score=round(overall_score, 2),
        grade=grade,
        knowledge_gaps=knowledge_gaps,
        recommendation=recommendation,
        question_breakdown=question_breakdown,
    )


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
