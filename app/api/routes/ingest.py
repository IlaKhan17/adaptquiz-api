from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.schemas.ingest import IngestResponse
from app.services.ingestion_service import ingest_document

router = APIRouter(prefix="/ingest", tags=["ingest"])

_ALLOWED_CONTENT_TYPES = {"application/pdf", "text/plain"}


@router.post("", response_model=IngestResponse, status_code=201)
async def ingest_file(
    file: UploadFile,
    subject: str = Form(default="general", description="Subject or topic area for this document"),
) -> IngestResponse:
    """
    Upload a PDF or plain-text file to be chunked and indexed for quiz generation.

    - **file**: PDF (`.pdf`) or plain-text (`.txt`) file to ingest.
    - **subject**: Optional subject label stored with each chunk (default: `general`).

    Returns metadata about the ingested document including the `doc_id` needed
    for subsequent quiz generation requests.
    """
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only PDF and .txt files are supported.",
        )

    return await ingest_document(file, subject)
