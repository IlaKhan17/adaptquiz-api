"""Shared fixtures.

Every test run gets a throwaway SQLite database and FAISS index, and OpenAI is stubbed
out, so the suite needs no API key and makes no network calls (apart from downloading
the local embedding model the first time).
"""
import json
import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="adaptquiz-tests-")
os.environ.update(
    OPENAI_API_KEY="sk-test",
    DATABASE_URL=f"sqlite+aiosqlite:///{_tmp}/test.db",
    FAISS_INDEX_PATH=f"{_tmp}/faiss",
    SECRET_KEY="test-secret-key-" + "x" * 48,
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

STUDY_TEXT = (
    "Photosynthesis is the process by which green plants convert light energy into chemical energy. "
    "It takes place mainly in the chloroplasts of leaf cells, which contain the pigment chlorophyll. "
    "During the light-dependent reactions, water is split and oxygen is released as a by-product. "
    "The Calvin cycle then uses carbon dioxide and ATP to build glucose molecules for the plant. "
) * 12

GENERATED_QUIZ = {
    "questions": [
        {
            "question_text": "Where does photosynthesis mainly take place?",
            "question_type": "mcq",
            "difficulty": "medium",
            "options": [
                {"label": "A", "text": "Mitochondria", "is_correct": False},
                {"label": "B", "text": "Chloroplasts", "is_correct": True},
                {"label": "C", "text": "Nucleus", "is_correct": False},
                {"label": "D", "text": "Ribosomes", "is_correct": False},
            ],
            "correct_answer": "B",
            "explanation": "Chloroplasts contain chlorophyll, which captures light energy.",
            "source_chunk": "It takes place mainly in the chloroplasts of leaf cells",
            "topic_tag": "chloroplasts",
        },
        {
            "question_text": "Oxygen is released during the Calvin cycle.",
            "question_type": "true_false",
            "difficulty": "medium",
            "options": None,
            "correct_answer": "False",
            "explanation": "Oxygen is released in the light-dependent reactions.",
            "source_chunk": "water is split and oxygen is released as a by-product",
            "topic_tag": "light reactions",
        },
        {
            "question_text": "Explain what photosynthesis does.",
            "question_type": "short_answer",
            "difficulty": "medium",
            "options": None,
            "correct_answer": "Converts light energy into chemical energy.",
            "explanation": "Plants store light energy as glucose.",
            "source_chunk": "convert light energy into chemical energy",
            "topic_tag": "photosynthesis",
        },
    ]
}

LLM_GRADE = {
    "is_correct": False,
    "score": 0.4,
    "score_percentage": 40,
    "rubric_feedback": [
        {"criterion": "Accuracy", "score": 0.5, "comment": "Partly right."},
        {"criterion": "Completeness", "score": 0.3, "comment": "Missing energy conversion."},
        {"criterion": "Terminology", "score": 0.4, "comment": "Vague terms."},
    ],
    "detailed_explanation": "Photosynthesis converts light energy into chemical energy.",
    "improvement_tip": "Mention the energy conversion.",
    "knowledge_gap_tags": ["energy conversion"],
}


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def fake_llm(monkeypatch):
    """Stub the OpenAI call: quiz generation gets GENERATED_QUIZ, grading gets LLM_GRADE."""
    prompts: list[str] = []

    async def quiz_llm(prompt: str, temperature: float = 0.3) -> str:
        prompts.append(prompt)
        return json.dumps(GENERATED_QUIZ)

    async def grade_llm(prompt: str, temperature: float = 0.3) -> str:
        prompts.append(prompt)
        return json.dumps(LLM_GRADE)

    monkeypatch.setattr("app.services.quiz_service.call_llm", quiz_llm)
    monkeypatch.setattr("app.services.eval_service.call_llm", grade_llm)
    monkeypatch.setattr(
        "app.services.quiz_service.fetch_curriculum_context", _no_web_search
    )
    return prompts


async def _no_web_search(**_kwargs) -> str:
    return ""


_user_counter = 0


def register(client: TestClient) -> dict:
    """Register a fresh user and return auth headers for them."""
    global _user_counter
    _user_counter += 1
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": f"student{_user_counter}@example.com", "password": "password123"},
    )
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def upload(client: TestClient, headers: dict, text: str = STUDY_TEXT, subject: str = "biology") -> dict:
    resp = client.post(
        "/api/v1/ingest",
        headers=headers,
        data={"subject": subject},
        files={"file": ("notes.txt", text.encode(), "text/plain")},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def auth(client) -> dict:
    return register(client)
