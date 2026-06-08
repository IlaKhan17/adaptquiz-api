# AdaptQuiz API

Turn any study material into adaptive quizzes with AI-graded feedback.

---

## What It Does

AdaptQuiz transforms static study documents into interactive, AI-powered quizzes in five steps:

1. **Ingest** — Upload a PDF or plain-text file. The API extracts the text, splits it into overlapping chunks, embeds each chunk as a vector, and stores it in a local FAISS index.
2. **Retrieve** — When a quiz is requested, all chunks for that document are fetched directly from the vector store using the document ID — no guesswork, no missed chunks.
3. **Generate** — The retrieved context is passed to GPT-4o with a structured prompt specifying difficulty, question types (MCQ, short answer, true/false, fill-in-the-blank), and count. The model returns a validated JSON object of questions.
4. **Evaluate** — Students submit answers to the grading endpoint. GPT-4o scores each answer against a three-criterion rubric (Accuracy, Completeness, Terminology) with partial credit, returning a percentage score, per-criterion feedback, improvement tips, and knowledge-gap tags.
5. **Report** — The session report endpoint aggregates all answers into an overall score, letter grade, top knowledge gaps, and a personalised study recommendation.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **FastAPI** | Async REST API framework with automatic OpenAPI / Swagger docs |
| **Uvicorn** | ASGI server for running the FastAPI application |
| **OpenAI GPT-4o** | Quiz generation and AI-graded answer evaluation |
| **LangChain** | Orchestration layer for the RAG pipeline |
| **FAISS** | Local vector store for fast similarity search — no external database needed |
| **sentence-transformers** | Local CPU embeddings (`all-MiniLM-L6-v2`) — zero embedding API cost |
| **pypdf** | PDF text extraction |
| **python-docx** | DOCX text extraction |
| **SQLAlchemy 2 + Alembic** | Database ORM and schema migrations |
| **Pydantic v2** | Request / response validation and settings management |
| **pytest + pytest-asyncio** | Async test suite |

---

## AI Concepts Used

| Concept | How It Is Applied |
|---|---|
| **Retrieval-Augmented Generation (RAG)** | Documents are chunked and stored as vectors in FAISS. At quiz-time the relevant chunks are retrieved by document ID and injected into the LLM prompt as grounded context, preventing hallucination. |
| **Vector Embeddings** | Each text chunk is encoded into a dense 384-dimensional vector using `all-MiniLM-L6-v2` running locally. Embeddings power semantic retrieval from the FAISS index at zero API cost. |
| **Structured Outputs** | GPT-4o is called with `response_format: json_object` and a detailed schema prompt, guaranteeing parseable JSON with no markdown fences or extra prose — making downstream parsing reliable. |
| **Prompt Engineering** | Separate, versioned prompt templates handle question generation and answer evaluation. Each prompt encodes difficulty guidance, question-type rules, field definitions, and strict output constraints. |
| **LLM-as-Judge Evaluation** | Rather than string-matching, GPT-4o grades student answers against a three-criterion rubric with partial credit — the same technique used in RLHF reward modelling and modern AI evaluation pipelines. |

---

## Quick Start

### Prerequisites

- Python 3.11+
- An OpenAI API key

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/adaptquiz-api.git
cd adaptquiz-api

# 2. Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Open .env and set your key:
#   OPENAI_API_KEY=sk-...

# 5. Start the server
uvicorn app.main:app --reload
```

The API is live at **http://localhost:8000**.  
Interactive docs (Swagger UI) at **http://localhost:8000/docs**.

---

## API Endpoints

| Method | Endpoint | Description | Example Body |
|---|---|---|---|
| `GET` | `/` | API name and docs URL | — |
| `GET` | `/api/v1/health` | Health check | — |
| `POST` | `/api/v1/ingest` | Upload and index a PDF or TXT file | `multipart/form-data` |
| `POST` | `/api/v1/quiz/generate` | Generate a quiz from an ingested document | `{"doc_id", "difficulty", "num_questions", "question_types"}` |
| `GET` | `/api/v1/quiz/{quiz_id}` | Retrieve a previously generated quiz | — |
| `POST` | `/api/v1/eval/answer` | Submit a student answer for AI grading | `{"session_id", "question_id", "student_answer"}` |
| `GET` | `/api/v1/session/{session_id}/report` | Full performance report for a session | — |

---

## Full Example Flow

The five commands below walk through the entire pipeline end-to-end.

### Step 1 — Ingest a document

```bash
curl -X POST http://localhost:8000/api/v1/ingest \
  -F "file=@study_notes.txt;type=text/plain" \
  -F "subject=programming"
```

```json
{
  "doc_id": "2a6555d8-6966-47f7-8feb-a8369ff863b0",
  "filename": "study_notes.txt",
  "subject": "programming",
  "chunks_created": 5,
  "total_chars": 2922
}
```

### Step 2 — Generate a quiz

```bash
curl -X POST http://localhost:8000/api/v1/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "2a6555d8-6966-47f7-8feb-a8369ff863b0",
    "difficulty": "easy",
    "num_questions": 3,
    "question_types": ["mcq", "short_answer"]
  }'
```

```json
{
  "quiz_id": "d681b607-9c9d-4ddb-aefd-8935e5f5e1f5",
  "session_id": "d05ff336-81ff-4262-a383-840d3b938a29",
  "difficulty": "easy",
  "total_questions": 3,
  "questions": [
    {
      "question_id": "0d3ae932-261b-4d04-995c-fd1bb1bb72af",
      "question_text": "What is the output of greet(\"Alice\")?",
      "question_type": "mcq",
      "options": [
        { "label": "A", "text": "Hello, Alice", "is_correct": true },
        { "label": "B", "text": "Hello, World", "is_correct": false },
        { "label": "C", "text": "Alice",        "is_correct": false },
        { "label": "D", "text": "Error",         "is_correct": false }
      ],
      "correct_answer": "Hello, Alice",
      "topic_tag": "functions"
    }
  ]
}
```

### Step 3 — Retrieve a quiz by ID

```bash
curl http://localhost:8000/api/v1/quiz/d681b607-9c9d-4ddb-aefd-8935e5f5e1f5
```

Returns the same `QuizResponse` as step 2.

### Step 4 — Submit an answer for grading

```bash
curl -X POST http://localhost:8000/api/v1/eval/answer \
  -H "Content-Type: application/json" \
  -d '{
    "session_id":     "d05ff336-81ff-4262-a383-840d3b938a29",
    "question_id":    "0d3ae932-261b-4d04-995c-fd1bb1bb72af",
    "student_answer": "Hello, Alice"
  }'
```

```json
{
  "question_id": "0d3ae932-261b-4d04-995c-fd1bb1bb72af",
  "is_correct": true,
  "score": 1.0,
  "score_percentage": 100,
  "rubric_feedback": [
    { "criterion": "Accuracy",     "score": 1.0, "comment": "The student's answer is factually correct." },
    { "criterion": "Completeness", "score": 1.0, "comment": "Addresses all parts of the question." },
    { "criterion": "Terminology",  "score": 1.0, "comment": "Uses appropriate terminology correctly." }
  ],
  "correct_answer": "Hello, Alice",
  "detailed_explanation": "The greet() function concatenates 'Hello, ' with the name argument and returns the result.",
  "improvement_tip": "Continue practising Python functions to reinforce your skills.",
  "knowledge_gap_tags": []
}
```

### Step 5 — Get the session report

```bash
curl http://localhost:8000/api/v1/session/d05ff336-81ff-4262-a383-840d3b938a29/report
```

```json
{
  "session_id": "d05ff336-81ff-4262-a383-840d3b938a29",
  "total_questions": 3,
  "answered": 1,
  "overall_score": 1.0,
  "grade": "A+",
  "knowledge_gaps": [],
  "recommendation": "Excellent work! You have a strong grasp of the material.",
  "question_breakdown": [
    {
      "question_id": "0d3ae932-261b-4d04-995c-fd1bb1bb72af",
      "question_text": "What is the output of greet(\"Alice\")?",
      "topic_tag": "functions",
      "is_correct": true,
      "score": 1.0
    }
  ]
}
```

---

## How It Works

```
                        AdaptQuiz API — Architecture
  ┌────────────────────────────────────────────────────────────────────┐
  │                                                                    │
  │   PDF / TXT                                                        │
  │      │                                                             │
  │      ▼                                                             │
  │  ┌──────────┐  extract &   ┌─────────────┐   embed (local CPU)    │
  │  │  ingest  │ ──────────►  │   chunker   │ ──────────────────────► │
  │  │ /ingest  │              │ 800 chars   │                         │
  │  └──────────┘              │ 100 overlap │   sentence-transformers  │
  │                            └─────────────┘   all-MiniLM-L6-v2      │
  │                                   │                                │
  │                                   ▼                                │
  │                            ┌─────────────┐                        │
  │                            │ FAISS index │  persisted to ./data/   │
  │                            │  doc_id +   │                        │
  │                            │  metadata   │                        │
  │                            └─────────────┘                        │
  │                                   │                                │
  │                  ┌────────────────┘                               │
  │                  │  fetch all chunks by doc_id                    │
  │                  ▼                                                 │
  │  ┌───────────────────┐  structured   ┌─────────────────────┐     │
  │  │  /quiz/generate   │ ── prompt ──► │    GPT-4o (LLM)     │     │
  │  │  difficulty       │               │  json_object mode   │     │
  │  │  question_types   │ ◄─ questions ─│  3–15 questions     │     │
  │  │  num_questions    │               └─────────────────────┘     │
  │  └───────────────────┘                                            │
  │           │   session_id + questions stored in memory             │
  │           ▼                                                        │
  │  ┌────────────────┐  student    ┌─────────────────────┐          │
  │  │  /eval/answer  │ ─ answer ─► │  GPT-4o (Judge)     │          │
  │  │                │             │  Accuracy            │          │
  │  │                │ ◄─ score ── │  Completeness        │          │
  │  └────────────────┘             │  Terminology         │          │
  │           │                     └─────────────────────┘          │
  │           ▼                                                        │
  │  ┌──────────────────┐                                             │
  │  │ /session/report  │  aggregate scores · grade · knowledge gaps  │
  │  └──────────────────┘  personalised study recommendation          │
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
adaptquiz-api/
├── app/
│   ├── main.py                    # FastAPI app, middleware, lifespan
│   ├── config.py                  # Pydantic settings (.env)
│   ├── api/routes/
│   │   ├── health.py              # GET  /api/v1/health
│   │   ├── ingest.py              # POST /api/v1/ingest
│   │   ├── quiz.py                # POST /api/v1/quiz/generate  ·  GET /api/v1/quiz/{id}
│   │   ├── eval.py                # POST /api/v1/eval/answer
│   │   └── session.py             # GET  /api/v1/session/{id}/report
│   ├── core/
│   │   ├── embedder.py            # HuggingFace sentence-transformers (local)
│   │   ├── chunker.py             # Sliding-window text chunker
│   │   ├── vector_store.py        # FAISS load / save / search / doc_id lookup
│   │   └── llm.py                 # OpenAI GPT-4o async wrapper
│   ├── services/
│   │   ├── ingestion_service.py   # Ingest pipeline orchestration
│   │   ├── quiz_service.py        # Quiz generation + in-memory session store
│   │   ├── eval_service.py        # Answer evaluation + rubric scoring
│   │   └── session_service.py     # Report aggregation + grade + recommendations
│   ├── prompts/
│   │   ├── question_gen.py        # Structured prompt for quiz generation
│   │   └── answer_eval.py         # Structured prompt for LLM-as-judge grading
│   └── schemas/
│       ├── ingest.py              # IngestResponse
│       ├── quiz.py                # QuizGenerateRequest, QuizResponse, Question
│       ├── eval.py                # AnswerSubmitRequest, AnswerEvalResponse
│       └── session.py             # SessionReport
├── tests/
├── data/                          # FAISS index (auto-created on first run)
├── requirements.txt
├── .env.example
└── README.md
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | Your OpenAI API key |
| `FAISS_INDEX_PATH` | No | `./data/faiss` | Path where the FAISS index is persisted |
| `EMBEDDING_MODEL` | No | `all-MiniLM-L6-v2` | sentence-transformers model name |
| `LLM_MODEL` | No | `gpt-4o` | OpenAI model for generation and grading |
| `CHUNK_SIZE` | No | `800` | Target character count per text chunk |
| `CHUNK_OVERLAP` | No | `100` | Overlap in characters between adjacent chunks |

---

## Built By

**Ila** — MCA Graduate, AI Engineer

Building production-ready AI systems with a focus on RAG pipelines, LLM evaluation, and developer tooling.
