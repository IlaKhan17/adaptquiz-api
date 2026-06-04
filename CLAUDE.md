# adaptquiz-api

Turn any study material into adaptive quizzes with AI-graded feedback.

## Stack

- **Web framework:** FastAPI + Uvicorn
- **AI / LLM:** Anthropic Claude (`anthropic` SDK) — quiz generation, structured outputs, AI grading
- **RAG pipeline:** LangChain (`langchain`, `langchain-community`, `langchain-anthropic`)
- **Vector store:** FAISS (`faiss-cpu`) — use `langchain_community.vectorstores.FAISS`, not ChromaDB
- **Embeddings:** `sentence-transformers` (local, CPU) — do NOT use the OpenAI embeddings API
- **PDF parsing:** `pypdf` — do NOT use PyMuPDF
- **DOCX parsing:** `python-docx`
- **Database:** SQLAlchemy 2 + Alembic
- **Settings:** `pydantic-settings` with `.env`
- **Testing:** `pytest` + `pytest-asyncio`

## Project structure

```
app/
  main.py                  # FastAPI app entry point
  config.py                # Pydantic settings (loads .env)
  api/routes/
    quiz.py                # Quiz generation endpoints
    documents.py           # Document upload / management
    feedback.py            # AI-graded feedback endpoints
  core/
    rag.py                 # RAG pipeline (embed + FAISS retrieve)
    quiz_generator.py      # Quiz generation logic
    grader.py              # AI grading logic
  models/                  # Pydantic request/response schemas
  db/                      # SQLAlchemy session
  services/                # Business logic layer
tests/
```

## Key implementation notes

- Vector store is FAISS, imported as `from langchain_community.vectorstores import FAISS`
- Embeddings are loaded locally via `from langchain_community.embeddings import HuggingFaceEmbeddings`
- PDF text extraction uses `pypdf.PdfReader`, not `fitz` / PyMuPDF
- All Claude calls use the `anthropic` SDK with structured outputs
