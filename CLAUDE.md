# adaptquiz-api

Turn any study material into adaptive quizzes with AI-graded feedback.

## Stack

- **Web framework:** FastAPI + Uvicorn
- **AI / LLM:** OpenAI `gpt-4o` (`openai` SDK, `AsyncOpenAI`) with JSON mode — quiz generation and AI grading
- **Vector store:** FAISS via `langchain_community.vectorstores.FAISS`, persisted to `FAISS_INDEX_PATH` — not ChromaDB
- **Embeddings:** local `sentence-transformers` via `langchain_huggingface.HuggingFaceEmbeddings` — do NOT use the OpenAI embeddings API
- **PDF parsing:** `pypdf.PdfReader` — do NOT use PyMuPDF / `fitz`
- **DOCX parsing:** `python-docx`
- **Database:** SQLAlchemy 2 (async) — SQLite (`aiosqlite`) locally, PostgreSQL (`asyncpg`) in production. Tables are created with `create_all` at startup; new SQLite columns go in `_SQLITE_COLUMN_MIGRATIONS` in `app/db/session.py` (Alembic is installed but not set up)
- **Auth:** JWT (`python-jose`) + bcrypt, plus Google Sign-In (`google-auth`)
- **Web search:** `duckduckgo-search` for optional curriculum context (soft-fails)
- **Settings:** `pydantic-settings` with `.env`
- **Testing:** `pytest` — run `pytest` from the repo root
- **Frontend:** React + Vite + TypeScript + Tailwind in `frontend/`

## Project structure

```
app/
  main.py                  # FastAPI app, middleware (CORS, catch-all errors), routers
  config.py                # Pydantic settings (loads .env)
  api/
    deps.py                # get_current_user (JWT bearer)
    routes/                # auth, documents, eval, health, ingest, quiz, session
  core/
    chunker.py             # sentence-based chunking + TOC/noise filtering
    embedder.py            # cached HuggingFaceEmbeddings
    llm.py                 # call_llm() — the single OpenAI entry point
    security.py            # password hashing, JWT encode/decode
    vector_store.py        # FAISS store: add, per-doc fetch, per-doc search
    web_search.py          # curriculum context via DuckDuckGo
  prompts/                 # question_gen.py, answer_eval.py prompt builders
  services/                # ingestion, quiz, eval, session business logic
  schemas/                 # Pydantic request/response models
  models/                  # SQLAlchemy ORM models
  db/                      # engine, session, create_tables
tests/                     # pytest suite; conftest.py stubs call_llm and uses a temp DB + FAISS
frontend/                  # React app (Vite dev server proxies /api → localhost:8000)
```

## Key implementation notes

- All data is scoped to the owning user — every query filters on `user_id`.
- Quiz responses use `StudentQuestion` and never include the answer key (`correct_answer`,
  `is_correct`, `explanation`, `source_chunk`). Correctness is returned only by `POST /eval/answer`
  (MCQ responses include `correct_option_label`).
- MCQ and true/false are graded deterministically; short_answer and fill_blank go through the LLM rubric.
- One shared FAISS index holds every document; chunks carry `doc_id` in metadata and
  `search_by_doc` filters on it after ranking the whole (flat) index.
- Production: frontend on Vercel (`adaptquiz.ilarehman.com`), API at `api.ilarehman.com`.
  Those origins are always allowed by CORS; `CORS_ORIGINS` adds extras.
- Tests stub `call_llm` and web search, so they need no API key; they do load the local embedding model.
