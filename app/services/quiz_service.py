import json
from uuid import uuid4

from fastapi import HTTPException

from app.core.llm import call_llm
from app.core.vector_store import get_chunks_by_doc_id, get_or_create_store, search
from app.prompts.question_gen import build_question_gen_prompt
from app.schemas.quiz import (
    Difficulty,
    MCQOption,
    Question,
    QuizGenerateRequest,
    QuizResponse,
    QuizType,
)

# In-memory session store: session_id -> session dict
quiz_sessions: dict[str, dict] = {}

_CONTEXT_SEPARATOR = "\n\n---\n\n"
_MAX_CONTEXT_CHUNKS = 10


async def generate_quiz(request: QuizGenerateRequest) -> QuizResponse:
    store = get_or_create_store()

    doc_chunks = get_chunks_by_doc_id(store, request.doc_id)

    if not doc_chunks:
        raise HTTPException(
            status_code=404,
            detail=f"No indexed content found for doc_id '{request.doc_id}'. "
                   "Ingest the document before generating a quiz.",
        )

    context = _CONTEXT_SEPARATOR.join(c["text"] for c in doc_chunks[:_MAX_CONTEXT_CHUNKS])

    prompt = build_question_gen_prompt(
        context=context,
        difficulty=request.difficulty.value,
        q_types=[qt.value for qt in request.question_types],
        num_questions=request.num_questions,
        topic=request.topic,
    )

    raw = await call_llm(prompt)
    raw_questions = _parse_question_list(raw)

    questions = [
        _build_question(q) for q in raw_questions[: request.num_questions]
    ]

    quiz_id = str(uuid4())
    session_id = str(uuid4())

    quiz_sessions[session_id] = {
        "quiz_id": quiz_id,
        "doc_id": request.doc_id,
        "topic": request.topic,
        "difficulty": request.difficulty,
        "questions": questions,
        "answers": {},
    }

    return QuizResponse(
        quiz_id=quiz_id,
        doc_id=request.doc_id,
        topic=request.topic,
        difficulty=request.difficulty,
        questions=questions,
        total_questions=len(questions),
        session_id=session_id,
    )


def _parse_question_list(raw: str) -> list[dict]:
    parsed = json.loads(raw)
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        # Prefer explicit "questions" key; fall back to first list-typed value
        if "questions" in parsed and isinstance(parsed["questions"], list):
            return parsed["questions"]
        for value in parsed.values():
            if isinstance(value, list) and value and isinstance(value[0], dict) and "question_text" in value[0]:
                return value
    raise ValueError(f"Could not locate question list in LLM response: {raw[:200]}")


def _build_question(raw: dict) -> Question:
    options = None
    if raw.get("question_type") == QuizType.mcq or raw.get("options"):
        raw_opts = raw.get("options") or []
        options = [
            MCQOption(
                label=opt.get("label", ""),
                text=opt.get("text", ""),
                is_correct=bool(opt.get("is_correct", False)),
            )
            for opt in raw_opts
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
