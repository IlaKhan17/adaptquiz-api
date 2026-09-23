FROM python:3.12-slim

WORKDIR /app

# Install system deps required by sentence-transformers / faiss
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# CPU-only PyTorch first — the default wheel pulls several GB of CUDA libraries the server can't use
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# Pre-download the embedding model so cold starts don't fetch from the internet
ARG EMBEDDING_MODEL=all-MiniLM-L6-v2
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('${EMBEDDING_MODEL}')"

EXPOSE 8000

# sh -c so $PORT (set by Railway) is expanded, falling back to 8000 locally;
# exec so uvicorn replaces the shell and receives shutdown signals directly
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
