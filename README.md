# AdaptQuiz API

> Upload any study material. Get AI-generated adaptive questions and rubric-based evaluation — via a production REST API.

---

## Live Demo
- Swagger UI: http://32.236.30.100:8000/docs
- Health: http://32.236.30.100:8000/api/v1/health

## What It Does

AdaptQuiz turns any static document into a fully interactive, AI-powered quiz session in five stages:

1. **Upload** — Send a PDF or plain-text file to the ingest endpoint. The API extracts the raw text, splits it into overlapping chunks, and embeds each chunk as a dense vector stored in a local FAISS index.
2. **Retrieve** — When a quiz is requested, all chunks belonging to that document are fetched directly from the vector store by document ID — ensuring nothing is missed regardless of how large the store grows.
3. **Generate** — The retrieved context is injected into a structured GPT-4o prompt that specifies difficulty level, question types (MCQ, short answer, true/false, fill-in-the-blank), and question count. The model returns a validated JSON object of fully formed questions with correct answers and explanations.
4. **Evaluate** — The student submits an answer. GPT-4o acts as a judge and scores it against a three-criterion rubric: **Accuracy**, **Completeness**, and **Terminology** — with partial credit where deserved. The response includes a percentage score, per-criterion feedback, an improvement tip, and knowledge-gap tags.
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
| **pypdf** | PDF text extraction |
| **Pydantic v2** | Request / response validation and settings management |

---

## AI Concepts Used

- **RAG (Retrieval-Augmented Generation)** — Documents are stored as vectors in FAISS and retrieved at quiz-time to ground every question in source material, eliminating hallucination.
- **Vector embeddings and similarity search** — Each chunk is encoded into a 384-dimensional vector using a local sentence-transformer model. Retrieval is done by fetching all vectors belonging to a given document ID.
- **Structured outputs with JSON mode** — GPT-4o is called with `response_format: json_object` and an explicit schema prompt, guaranteeing parseable, schema-conformant output on every call.
- **Prompt engineering for education domain** — Separate prompt templates for question generation and answer grading encode difficulty taxonomy, question-type rules, field definitions, and strict output constraints tuned for educational assessment.
- **LLM-as-judge evaluation with rubric scoring** — Rather than string-matching, GPT-4o evaluates free-text student answers against a three-criterion rubric with partial credit — the same technique used in RLHF reward modelling and AI evaluation research.
- **Knowledge gap analysis** — Each evaluation response carries `knowledge_gap_tags` that are aggregated at the session level, ranked by frequency, and surfaced in the final report alongside a targeted study recommendation.

---

## Quick Start

**Prerequisites:** Python 3.11+, an OpenAI API key.

```bash
# 1. Clone the repository
git clone https://github.com/your-username/adaptquiz-api.git
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
```

API live at **`http://localhost:8000`** · Swagger UI at **`http://localhost:8000/docs`**

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/ingest` | Upload a PDF or TXT file — extracts, chunks, embeds, and indexes |
| `POST` | `/api/v1/quiz/generate` | Generate an adaptive quiz from an ingested document |
| `GET` | `/api/v1/quiz/{quiz_id}` | Retrieve a previously generated quiz by ID |
| `POST` | `/api/v1/eval/answer` | Submit a student answer for AI rubric grading |
| `GET` | `/api/v1/session/{session_id}/report` | Get the full performance report for a session |
| `GET` | `/api/v1/health` | Health check |

---

## Demo Flow

Five curl commands — full pipeline from upload to report.

### 1. Ingest a document

```bash
curl -X POST http://localhost:8000/api/v1/ingest \
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
        { "label": "A", "text": "The model works with unlabelled data.",               "is_correct": false },
        { "label": "B", "text": "The model is trained on labelled examples.",          "is_correct": true  },
        { "label": "C", "text": "The model receives a reward signal for actions.",     "is_correct": false },
        { "label": "D", "text": "The model uses spatial filters to process images.",   "is_correct": false }
      ],
      "correct_answer": "The model is trained on labelled examples.",
      "topic_tag": "Supervised Learning"
    }
  ]
}
```

### 3. Retrieve a quiz by ID

```bash
curl http://localhost:8000/api/v1/quiz/285c1d91-ebc5-43ee-90ea-b19c2126dfb2
```

Returns the full `QuizResponse` including all questions and the `session_id`.

### 4. Submit an answer for grading

```bash
curl -X POST http://localhost:8000/api/v1/eval/answer \
  -H "Content-Type: application/json" \
  -d '{
    "session_id":     "f765e443-eaea-4c94-bc60-094c8c0a71ef",
    "question_id":    "b054ea8f-2b96-4c4d-8eb6-a172d5213f4f",
    "student_answer": "The model is trained on labelled examples."
  }'
```

```json
{
  "is_correct": true,
  "score": 1.0,
  "score_percentage": 100,
  "rubric_feedback": [
    { "criterion": "Accuracy",     "score": 1.0, "comment": "The student's answer is factually correct." },
    { "criterion": "Completeness", "score": 1.0, "comment": "The student's answer fully addresses the question." },
    { "criterion": "Terminology",  "score": 1.0, "comment": "The student uses domain-appropriate terminology correctly." }
  ],
  "correct_answer": "The model is trained on labelled examples.",
  "improvement_tip": "Review the key characteristics of supervised, unsupervised, and reinforcement learning.",
  "knowledge_gap_tags": []
}
```

### 5. Get the session report

```bash
curl http://localhost:8000/api/v1/session/f765e443-eaea-4c94-bc60-094c8c0a71ef/report
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
                                        │  fetch all chunks by doc_id
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
  │  Question + correct answer + student answer             │
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
