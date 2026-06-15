from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.ingest import IngestResponse
from app.services.ingestion_service import ingest_document

router = APIRouter(prefix="/ingest", tags=["ingest"])

_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.post("", response_model=IngestResponse, status_code=201)
async def ingest_file(
    file: UploadFile,
    subject: str = Form(default="general", description="Subject or topic area for this document"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IngestResponse:
    """Upload a PDF, DOCX, or plain-text file to be chunked and indexed for quiz generation."""
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Only PDF, DOCX, and .txt files are supported.")
    return await ingest_document(file, subject, current_user.id, db)
