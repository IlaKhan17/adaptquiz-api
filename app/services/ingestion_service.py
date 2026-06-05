import io
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from pypdf import PdfReader

from app.core.chunker import chunk_text
from app.core.vector_store import get_or_create_store, save_store
from app.schemas.ingest import IngestResponse

_MIN_TEXT_LENGTH = 100


async def ingest_document(file: UploadFile, subject: str) -> IngestResponse:
    raw_bytes = await file.read()
    filename = file.filename or "upload"

    text = _extract_text(raw_bytes, filename)

    if len(text) < _MIN_TEXT_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"Extracted text is too short ({len(text)} chars). "
                   "Minimum is 100 characters — check the file has readable content.",
        )

    doc_id = str(uuid4())
    chunks = chunk_text(text, doc_id)

    texts = [c["text"] for c in chunks]
    metadatas = [
        {**c["metadata"], "subject": subject, "filename": filename}
        for c in chunks
    ]

    store = get_or_create_store()
    store.add_texts(texts, metadatas=metadatas)
    save_store(store)

    return IngestResponse(
        doc_id=doc_id,
        filename=filename,
        subject=subject,
        chunks_created=len(chunks),
        total_chars=len(text),
    )


def _extract_text(raw_bytes: bytes, filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(raw_bytes))
        return "\n".join(
            page.extract_text() or "" for page in reader.pages
        ).strip()
    if lower.endswith(".txt"):
        return raw_bytes.decode("utf-8").strip()
    raise HTTPException(
        status_code=422,
        detail=f"Unsupported file type '{filename}'. Only PDF and TXT files are accepted.",
    )
