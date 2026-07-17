import os
import threading

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from app.config import settings
from app.core.embedder import get_embeddings

_store: FAISS | None = None
_store_lock = threading.Lock()


def _init_store_locked() -> FAISS:
    """Initialize the store if needed. Caller MUST hold _store_lock."""
    global _store
    if _store is None:
        embeddings = get_embeddings()
        index_file = os.path.join(settings.faiss_index_path, "index.faiss")
        if os.path.exists(index_file):
            _store = FAISS.load_local(
                settings.faiss_index_path, embeddings, allow_dangerous_deserialization=True
            )
        else:
            placeholder = Document(page_content="init", metadata={})
            _store = FAISS.from_documents([placeholder], embeddings)
            os.makedirs(settings.faiss_index_path, exist_ok=True)
            _store.save_local(settings.faiss_index_path)
    return _store


def get_or_create_store() -> FAISS:
    """Return the cached store, initializing it on first call."""
    global _store
    if _store is None:
        with _store_lock:
            # Double-checked: another thread may have initialized between check and lock
            _init_store_locked()
    return _store  # type: ignore[return-value]


def add_texts_and_save(texts: list[str], metadatas: list[dict]) -> None:
    """Thread-safe: add chunks to the in-memory store and persist to disk."""
    with _store_lock:
        # Reuse _init_store_locked (doesn't re-acquire the lock — safe because we hold it)
        store = _init_store_locked()
        store.add_texts(texts, metadatas=metadatas)
        os.makedirs(settings.faiss_index_path, exist_ok=True)
        store.save_local(settings.faiss_index_path)


def search(store: FAISS, query: str, k: int = 5) -> list[dict]:
    results = store.similarity_search_with_score(query, k=k)
    return [
        {"text": doc.page_content, "metadata": doc.metadata, "score": float(score)}
        for doc, score in results
    ]


def get_chunks_by_doc_id(store: FAISS, doc_id: str) -> list[dict]:
    """Return all stored chunks for a specific doc_id by walking the docstore directly."""
    chunks = []
    for doc in store.docstore._dict.values():
        if doc.metadata.get("doc_id") == doc_id:
            chunks.append({"text": doc.page_content, "metadata": doc.metadata})
    chunks.sort(key=lambda c: c["metadata"].get("chunk_index", 0))
    return chunks


def search_by_doc(store: FAISS, query: str, doc_id: str, k: int = 10) -> list[dict]:
    """Semantic search limited to a specific document."""
    total = len(store.docstore._dict)
    fetch_k = max(k * 5, min(total, 200))
    results = store.similarity_search_with_score(query, k=fetch_k)
    filtered = [
        {"text": doc.page_content, "metadata": doc.metadata, "score": float(score)}
        for doc, score in results
        if doc.metadata.get("doc_id") == doc_id
    ]
    return filtered[:k]
