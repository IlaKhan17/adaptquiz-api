import asyncio
import json
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm import call_llm
from app.core.vector_store import get_chunks_by_doc_id, get_or_create_store, search_by_doc
from app.core.web_search import fetch_curriculum_context
from app.models.document import Document
from app.models.quiz import Question as DBQuestion
from app.models.quiz import Quiz
from app.models.session_model import QuizSession
from app.prompts.question_gen import build_question_gen_prompt
from app.schemas.quiz import (
    Difficulty,
    MCQOption,
    Question,
    QuizGenerateRequest,
    QuizResponse,
    QuizType,
)

_CONTEXT_SEPARATOR = "\n\n---\n\n"
_MAX_CONTEXT_CHUNKS = 10


async def generate_quiz(
    request: QuizGenerateRequest,
    user_id: str,
    db: AsyncSession,
) -> QuizResponse:
    result = await db.execute(
        select(Document).where(
            Document.doc_id == request.doc_id, Document.user_id == user_id
        )
    )
    doc_record = result.scalar_one_or_none()
    if not doc_record:
        raise HTTPException(
            status_code=404,
            detail=f"Document '{request.doc_id}' not found.",
        )

    store = await asyncio.to_thread(get_or_create_store)

    if request.topic:
        # Semantic search: find the chunks most relevant to the requested topic
        doc_chunks = await asyncio.to_thread(
            search_by_doc, store, request.topic, request.doc_id, _MAX_CONTEXT_CHUNKS
        )
        if not doc_chunks:
            # Fallback if filter yields nothing
            doc_chunks = await asyncio.to_thread(get_chunks_by_doc_id, store, request.doc_id)
    else:
        doc_chunks = await asyncio.to_thread(get_chunks_by_doc_id, store, request.doc_id)

    if not doc_chunks:
        raise HTTPException(
            status_code=404,
            detail=f"No indexed content found for doc_id '{request.doc_id}'. "
                   "Ingest the document before generating a quiz.",
        )

    # Sample evenly across the document so questions cover the whole material, not just the start
    sampled = _sample_chunks(doc_chunks, _MAX_CONTEXT_CHUNKS)
    context = _CONTEXT_SEPARATOR.join(c["text"] for c in sampled)

    # Fetch curriculum-aligned web context if the student specified their curriculum
    web_context: str | None = None
    if request.curriculum:
        web_context = await fetch_curriculum_context(
            curriculum=request.curriculum,
            subject=doc_record.subject or "",
            topic=request.topic,
        ) or None

    prompt = build_question_gen_prompt(
        context=context,
        difficulty=request.difficulty.value,
        q_types=[qt.value for qt in request.question_types],
        num_questions=request.num_questions,
        topic=request.topic,
        curriculum=request.curriculum,
        web_context=web_context,
    )

    raw = await call_llm(prompt)
    raw_questions = _parse_question_list(raw)
    questions = [_build_question(q) for q in raw_questions[: request.num_questions]]

    quiz_id = str(uuid4())
    session_id = str(uuid4())

    quiz = Quiz(
        user_id=user_id,
        document_id=doc_record.id,
        quiz_id=quiz_id,
        topic=request.topic,
        curriculum=request.curriculum,
        difficulty=request.difficulty.value,
        total_questions=len(questions),
    )
    db.add(quiz)
    await db.flush()

    for q in questions:
        opts = None
        if q.options:
            opts = [{"label": o.label, "text": o.text, "is_correct": o.is_correct} for o in q.options]
        db.add(
            DBQuestion(
                quiz_id=quiz.id,
                question_id=q.question_id,
                question_text=q.question_text,
                question_type=q.question_type.value,
                difficulty=q.difficulty.value,
                options=opts,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                source_chunk=q.source_chunk,
                topic_tag=q.topic_tag,
            )
        )

    db.add(QuizSession(user_id=user_id, quiz_id=quiz.id, session_id=session_id))
    await db.commit()

    return QuizResponse(
        quiz_id=quiz_id,
        doc_id=request.doc_id,
        topic=request.topic,
        difficulty=request.difficulty,
        questions=questions,
        total_questions=len(questions),
        session_id=session_id,
    )


async def get_quiz_by_id(quiz_id: str, user_id: str, db: AsyncSession) -> QuizResponse:
    result = await db.execute(
        select(Quiz).where(Quiz.quiz_id == quiz_id, Quiz.user_id == user_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail=f"Quiz '{quiz_id}' not found.")

    doc = (await db.execute(select(Document).where(Document.id == quiz.document_id))).scalar_one_or_none()
    db_questions = (await db.execute(select(DBQuestion).where(DBQuestion.quiz_id == quiz.id))).scalars().all()
    session = (await db.execute(select(QuizSession).where(QuizSession.quiz_id == quiz.id, QuizSession.user_id == user_id))).scalar_one_or_none()

    return QuizResponse(
        quiz_id=quiz_id,
        doc_id=doc.doc_id if doc else "",
        topic=quiz.topic,
        difficulty=Difficulty(quiz.difficulty),
        questions=[_db_to_schema(q) for q in db_questions],
        total_questions=len(db_questions),
        session_id=session.session_id if session else "",
    )


async def get_session_quiz(session_id: str, user_id: str, db: AsyncSession) -> QuizResponse:
    session = (
        await db.execute(
            select(QuizSession).where(
                QuizSession.session_id == session_id, QuizSession.user_id == user_id
            )
        )
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    quiz = (await db.execute(select(Quiz).where(Quiz.id == session.quiz_id))).scalar_one_or_none()
    doc = (await db.execute(select(Document).where(Document.id == quiz.document_id))).scalar_one_or_none()
    db_questions = (await db.execute(select(DBQuestion).where(DBQuestion.quiz_id == quiz.id))).scalars().all()

    return QuizResponse(
        quiz_id=quiz.quiz_id,
        doc_id=doc.doc_id if doc else "",
        topic=quiz.topic,
        difficulty=Difficulty(quiz.difficulty),
        questions=[_db_to_schema(q) for q in db_questions],
        total_questions=len(db_questions),
        session_id=session_id,
    )


async def list_user_quizzes(user_id: str, db: AsyncSession) -> list[dict]:
    quizzes = (
        await db.execute(
            select(Quiz).where(Quiz.user_id == user_id).order_by(Quiz.created_at.desc())
        )
    ).scalars().all()

    items = []
    for quiz in quizzes:
        doc = (await db.execute(select(Document).where(Document.id == quiz.document_id))).scalar_one_or_none()
        session = (await db.execute(select(QuizSession).where(QuizSession.quiz_id == quiz.id, QuizSession.user_id == user_id))).scalar_one_or_none()
        items.append({
            "quiz_id": quiz.quiz_id,
            "session_id": session.session_id if session else "",
            "doc_filename": doc.filename if doc else "",
            "subject": doc.subject if doc else "",
            "topic": quiz.topic,
            "difficulty": quiz.difficulty,
            "total_questions": quiz.total_questions,
            "created_at": quiz.created_at.isoformat(),
        })
    return items


def _db_to_schema(q: DBQuestion) -> Question:
    options = None
    if q.options:
        options = [MCQOption(label=o["label"], text=o["text"], is_correct=o["is_correct"]) for o in q.options]
    return Question(
        question_id=q.question_id,
        question_text=q.question_text,
        question_type=QuizType(q.question_type),
        difficulty=Difficulty(q.difficulty),
        options=options,
        correct_answer=q.correct_answer,
        explanation=q.explanation,
        source_chunk=q.source_chunk,
        topic_tag=q.topic_tag,
    )


def _sample_chunks(chunks: list[dict], n: int) -> list[dict]:
    """Sample n chunks evenly distributed across the document."""
    if len(chunks) <= n:
        return chunks
    step = len(chunks) / n
    return [chunks[int(i * step)] for i in range(n)]


def _parse_question_list(raw: str) -> list[dict]:
    parsed = json.loads(raw)
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        if "questions" in parsed and isinstance(parsed["questions"], list):
            return parsed["questions"]
        for value in parsed.values():
            if isinstance(value, list) and value and isinstance(value[0], dict) and "question_text" in value[0]:
                return value
    raise ValueError(f"Could not locate question list in LLM response: {raw[:200]}")


def _build_question(raw: dict) -> Question:
    options = None
    if raw.get("question_type") == QuizType.mcq or raw.get("options"):
        options = [
            MCQOption(
                label=opt.get("label", ""),
                text=opt.get("text", ""),
                is_correct=bool(opt.get("is_correct", False)),
            )
            for opt in (raw.get("options") or [])
        ]
    return Question(
        question_id=str(uuid4()),
        question_text=raw.get("question_text", ""),
        question_type=QuizType(raw.get("question_type", QuizType.short_answer)),
        difficulty=Difficulty(raw.get("difficulty", Difficulty.medium)),
        options=options,
        correct_answer=raw.get("correct_answer", ""),
        explanation=raw.get("explanation", ""),
        source_chunk=raw.get("source_chunk", ""),
        topic_tag=raw.get("topic_tag", ""),
    )
