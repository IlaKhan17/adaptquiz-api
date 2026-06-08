import os
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from app.config import settings
from app.core.embedder import get_embeddings


def get_or_create_store() -> FAISS:
    embeddings = get_embeddings()
    index_path = settings.faiss_index_path
    if os.path.exists(index_path):
        return FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
    # Bootstrap an empty store with a placeholder document
    placeholder = Document(page_content="init", metadata={})
    store = FAISS.from_documents([placeholder], embeddings)
    return store


def save_store(store: FAISS) -> None:
    os.makedirs(settings.faiss_index_path, exist_ok=True)
    store.save_local(settings.faiss_index_path)


def search(store: FAISS, query: str, k: int = 5) -> list[dict]:
    results = store.similarity_search_with_score(query, k=k)
    return [
        {
            "text": doc.page_content,
            "metadata": doc.metadata,
            "score": float(score),
        }
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
