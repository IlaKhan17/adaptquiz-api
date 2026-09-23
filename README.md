# AdaptQuiz API

> Upload any study material. Get AI-generated adaptive questions and rubric-based evaluation — via a production REST API.

---

## Live Demo
- App: https://adaptquiz.ilarehman.com
- Swagger UI: https://api.ilarehman.com/docs
- Health: https://api.ilarehman.com/api/v1/health

## What It Does

AdaptQuiz turns any static document into a fully interactive, AI-powered quiz session in five stages:

1. **Upload** — Send a PDF, DOCX, or plain-text file to the ingest endpoint. The API extracts the raw text, splits it into overlapping chunks, and embeds each chunk as a dense vector stored in a local FAISS index.
2. **Retrieve** — When a quiz is requested, the document's chunks are fetched from the vector store by document ID and sampled evenly across the material. If the student names a topic, a semantic search restricted to that document picks the most relevant chunks instead.
3. **Generate** — The retrieved context is injected into a structured GPT-4o prompt that specifies difficulty level, question types (MCQ, short answer, true/false, fill-in-the-blank), and question count. The model returns a validated JSON object of fully formed questions with correct answers and explanations. The answer key stays on the server — the client only ever receives the questions and options.
4. **Evaluate** — The student submits an answer. MCQ and true/false answers are graded deterministically; for short-answer and fill-in-the-blank, GPT-4o acts as a judge and scores it against a three-criterion rubric: **Accuracy**, **Completeness**, and **Terminology** — with partial credit where deserved. The response includes a percentage score, per-criterion feedback, an improvement tip, and knowledge-gap tags.
5. **Report** — The session report endpoint aggregates every answered question into an overall score, a letter grade (A+ to Needs Improvement), the top knowledge gaps ranked by frequency, and a personalised study recommendation.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **FastAPI** | Async REST API framework with automatic OpenAPI / Swagger docs |
| **GPT-4o** | Question generation and AI-graded answer evaluation |
| **FAISS** | Local vector store for fast similarity search — no external database needed |
| **LangChain** | RAG pipeline orchestration — chunking, embedding, retrieval |
| **sentence-transformers** | Local CPU embeddings (`all-MiniLM-L6-v2`) — zero embedding API cost |
| **pypdf** / **python-docx** | PDF and DOCX text extraction |
| **Pydantic v2** | Request / response validation and settings management |
| **SQLAlchemy 2 (async)** | Users, documents, quizzes, sessions and answers — SQLite locally, PostgreSQL in production |
| **JWT + Google Sign-In** | Authentication; every document, quiz and session is scoped to its owner |
| **pytest** | End-to-end API tests with the LLM stubbed out |
| **React + Vite + Tailwind** | Frontend (`frontend/`) |

---

## AI Concepts Used

- **RAG (Retrieval-Augmented Generation)** — Documents are stored as vectors in FAISS and retrieved at quiz-time to ground every question in source material, eliminating hallucination.
- **Vector embeddings and similarity search** — Each chunk is encoded into a 384-dimensional vector using a local sentence-transformer model. Retrieval fetches a document's chunks by ID, or runs a similarity search restricted to that document when a topic is given.
- **Structured outputs with JSON mode** — GPT-4o is called with `response_format: json_object` and an explicit schema prompt, guaranteeing parseable, schema-conformant output on every call.
- **Prompt engineering for education domain** — Separate prompt templates for question generation and answer grading encode difficulty taxonomy, question-type rules, field definitions, and strict output constraints tuned for educational assessment.
- **LLM-as-judge evaluation with rubric scoring** — Rather than string-matching, GPT-4o evaluates free-text student answers against a three-criterion rubric with partial credit — the same technique used in RLHF reward modelling and AI evaluation research.
- **Knowledge gap analysis** — Each evaluation response carries `knowledge_gap_tags` that are aggregated at the session level, ranked by frequency, and surfaced in the final report alongside a targeted study recommendation.

---

## Quick Start

**Prerequisites:** Python 3.11+, an OpenAI API key.

```bash
# 1. Clone the repository
git clone https://github.com/IlaKhan17/adaptquiz-api.git
cd adaptquiz-api

# 2. Create a virtual environment
python -m venv venv

# 3. Activate it
#    Windows:
venv\Scripts\activate
#    macOS / Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create your .env file
cp .env.example .env
# Add your OpenAI key inside .env:
#   OPENAI_API_KEY=sk-...

# 6. Start the server
uvicorn app.main:app --reload

# 7. (Optional) Start the frontend — proxies /api to localhost:8000
cd frontend && npm install && npm run dev
```

### Running the tests

```bash
pytest
```

The suite runs the whole flow — register, upload, generate, answer, report — against a throwaway SQLite database and FAISS index, with OpenAI stubbed out, so it needs no API key.

API live at **`http://localhost:8000`** · Swagger UI at **`http://localhost:8000/docs`**

---

## API Endpoints

All endpoints except auth and health require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Create an account (email + password) — returns a JWT |
| `POST` | `/api/v1/auth/login` | Log in (OAuth2 form: `username`, `password`) — returns a JWT |
| `POST` | `/api/v1/auth/google` | Sign in with a Google ID token |
| `GET` | `/api/v1/auth/me` | Current user |
| `POST` | `/api/v1/ingest` | Upload a PDF, DOCX, or TXT file (max 20 MB) — extracts, chunks, embeds, and indexes |
| `GET` | `/api/v1/documents` | List your uploaded documents |
| `POST` | `/api/v1/quiz/generate` | Generate an adaptive quiz from an ingested document |
| `GET` | `/api/v1/quiz` | List your quizzes |
| `GET` | `/api/v1/quiz/{quiz_id}` | Retrieve a previously generated quiz by ID |
| `POST` | `/api/v1/eval/answer` | Submit a student answer for grading |
| `GET` | `/api/v1/session` | List your quiz sessions with scores |
| `GET` | `/api/v1/session/{session_id}/quiz` | Get the questions for a session |
| `GET` | `/api/v1/session/{session_id}/report` | Get the full performance report for a session |
| `GET` | `/api/v1/health` | Health check |

---

## Demo Flow

Full pipeline from sign-up to report.

### 0. Get a token

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "password123"}' | jq -r .access_token)
```

### 1. Ingest a document

```bash
curl -X POST http://localhost:8000/api/v1/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@notes.pdf;type=application/pdf" \
  -F "subject=machine-learning"
```

```json
{
  "doc_id": "98f5aa0b-5559-4adf-bfc7-c730511c254a",
  "filename": "notes.pdf",
  "subject": "machine-learning",
  "chunks_created": 9,
  "total_chars": 5604
}
```

### 2. Generate a quiz

```bash
curl -X POST http://localhost:8000/api/v1/quiz/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "98f5aa0b-5559-4adf-bfc7-c730511c254a",
    "difficulty": "medium",
    "num_questions": 4,
    "question_types": ["mcq", "short_answer", "true_false"]
  }'
```

```json
{
  "quiz_id": "285c1d91-ebc5-43ee-90ea-b19c2126dfb2",
  "session_id": "f765e443-eaea-4c94-bc60-094c8c0a71ef",
  "difficulty": "medium",
  "total_questions": 4,
  "questions": [
    {
      "question_id": "b054ea8f-2b96-4c4d-8eb6-a172d5213f4f",
      "question_text": "Which of the following is a characteristic of supervised learning?",
      "question_type": "mcq",
      "options": [
        { "label": "A", "text": "The model works with unlabelled data." },
        { "label": "B", "text": "The model is trained on labelled examples." },
        { "label": "C", "text": "The model receives a reward signal for actions." },
        { "label": "D", "text": "The model uses spatial filters to process images." }
      ],
      "topic_tag": "Supervised Learning"
    }
  ]
}
```

The answer key is never included — correctness comes back only when an answer is submitted.

### 3. Retrieve a quiz by ID

```bash
curl http://localhost:8000/api/v1/quiz/285c1d91-ebc5-43ee-90ea-b19c2126dfb2 \
  -H "Authorization: Bearer $TOKEN"
```

Returns the full `QuizResponse` including all questions and the `session_id`.

### 4. Submit an answer for grading

```bash
curl -X POST http://localhost:8000/api/v1/eval/answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id":     "f765e443-eaea-4c94-bc60-094c8c0a71ef",
    "question_id":    "b054ea8f-2b96-4c4d-8eb6-a172d5213f4f",
    "student_answer": "B"
  }'
```

```json
{
  "is_correct": true,
  "score": 1.0,
  "score_percentage": 100,
  "rubric_feedback": [
    { "criterion": "Accuracy", "score": 1.0, "comment": "Correct! You selected B: The model is trained on labelled examples." }
  ],
  "correct_answer": "B. The model is trained on labelled examples.",
  "correct_option_label": "B",
  "improvement_tip": "",
  "knowledge_gap_tags": []
}
```

MCQ and true/false are graded directly. Short-answer and fill-in-the-blank answers go to GPT-4o, which returns three rubric criteria — **Accuracy**, **Completeness**, **Terminology** — with partial credit.

### 5. Get the session report

```bash
curl http://localhost:8000/api/v1/session/f765e443-eaea-4c94-bc60-094c8c0a71ef/report \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "overall_score": 0.83,
  "grade": "A",
  "answered": 2,
  "total_questions": 4,
  "knowledge_gaps": [
    { "topic": "generalization",    "frequency": 1 },
    { "topic": "model_performance", "frequency": 1 }
  ],
  "recommendation": "Good progress. Focus your revision on: generalization, model_performance.",
  "question_breakdown": [...]
}
```

---

## Real Test Results

**Document:** `ml_fundamentals.pdf` — 2-page PDF covering ML types, key terminology, common algorithms, neural networks, and model evaluation.

| Metric | Result |
|---|---|
| Chunks ingested | **9** |
| Characters extracted | 5,604 |
| Questions generated | 4 (MCQ, short answer, true/false) |
| Correct answer score | 100% — all rubric criteria: 1.0 |
| Partial answer score | **67%** — Accuracy 0.5 (phrasing off), Completeness 0.5 (missing detail), Terminology 1.0 |
| Session grade | **A** (overall score: 0.83) |
| Knowledge gaps identified | `generalization`, `model_performance` |
| Recommendation | Targeted study advice generated automatically |

Partial credit worked exactly as designed — a student who wrote *"the model is too accurate on training data"* received 0.5 on Accuracy and 0.5 on Completeness (missing the generalisation explanation), but full credit on Terminology for correct use of the term "overfitting".

---

## Architecture

```
  PDF / TXT
      │
      ▼
  ┌─────────────────────────────────────────────────────────┐
  │  POST /ingest                                           │
  │                                                         │
  │  Extract text → Chunk (800 chars, 100 overlap)          │
  │       → Embed (sentence-transformers, local CPU)        │
  │       → Store in FAISS index  ──────────────────────►  │
  └─────────────────────────────────────────────────────────┘
                                        │
                               FAISS Index (./data/)
                                        │
                                        │  chunks by doc_id (or topic search within the doc)
                                        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  POST /quiz/generate                                    │
  │                                                         │
  │  Retrieved context + difficulty + question types        │
  │       → Structured prompt  ──────────►  GPT-4o         │
  │       ◄── { "questions": [...] }  ────────────────────  │
  └─────────────────────────────────────────────────────────┘
                                        │
                                   Questions + session_id
                                        │
                                        ▼
  Student answer
      │
      ▼
  ┌─────────────────────────────────────────────────────────┐
  │  POST /eval/answer                                      │
  │                                                         │
  │  MCQ / true-false → graded directly                     │
  │  Short answer / fill-blank:                             │
  │       → Rubric prompt  ───────────────►  GPT-4o Judge  │
  │       ◄── score · feedback · gap_tags  ───────────────  │
  └─────────────────────────────────────────────────────────┘
                                        │
                              Answers stored in session
                                        │
                                        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  GET /session/{id}/report                               │
  │                                                         │
  │  Aggregate scores → overall_score → grade               │
  │  Count gap_tags   → knowledge_gaps (top 5)             │
  │  Generate         → personalised recommendation        │
  └─────────────────────────────────────────────────────────┘
```

---

## Built By

**Ila** — MCA Graduate | AI Engineer in Training

GitHub: [https://github.com/IlaKhan17]
