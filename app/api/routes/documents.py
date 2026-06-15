from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.document import Document
from app.models.user import User

router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentItem(BaseModel):
    doc_id: str
    filename: str
    subject: str
    chunks_created: int
    total_chars: int
    created_at: str


@router.get("", response_model=list[DocumentItem])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentItem]:
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    return [
        DocumentItem(
            doc_id=d.doc_id,
            filename=d.filename,
            subject=d.subject,
            chunks_created=d.chunks_created,
            total_chars=d.total_chars,
            created_at=d.created_at.isoformat(),
        )
        for d in result.scalars().all()
    ]
