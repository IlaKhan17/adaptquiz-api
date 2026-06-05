from pydantic import BaseModel, Field


class IngestResponse(BaseModel):
    doc_id: str = Field(description="Unique identifier assigned to the ingested document")
    filename: str = Field(description="Original filename of the uploaded document")
    subject: str = Field(description="Subject or topic area inferred from the document")
    chunks_created: int = Field(description="Number of text chunks created during ingestion")
    total_chars: int = Field(description="Total character count of the extracted document text")
