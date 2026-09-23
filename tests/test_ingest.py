import io

from docx import Document as DocxDocument

from app.config import settings
from app.services.ingestion_service import _clean_extracted_text
from tests.conftest import STUDY_TEXT, upload


def test_ingest_txt(client, auth):
    doc = upload(client, auth)
    assert doc["chunks_created"] > 0
    assert doc["subject"] == "biology"

    listed = client.get("/api/v1/documents", headers=auth).json()
    assert [d["doc_id"] for d in listed] == [doc["doc_id"]]


def test_ingest_docx(client, auth):
    docx = DocxDocument()
    for para in STUDY_TEXT.split(". "):
        docx.add_paragraph(para)
    buf = io.BytesIO()
    docx.save(buf)

    resp = client.post(
        "/api/v1/ingest",
        headers=auth,
        files={
            "file": (
                "notes.docx",
                buf.getvalue(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["chunks_created"] > 0


def test_unsupported_content_type(client, auth):
    resp = client.post(
        "/api/v1/ingest", headers=auth, files={"file": ("x.png", b"\x89PNG", "image/png")}
    )
    assert resp.status_code == 415


def test_text_too_short(client, auth):
    resp = client.post(
        "/api/v1/ingest", headers=auth, files={"file": ("x.txt", b"too short", "text/plain")}
    )
    assert resp.status_code == 422


def test_upload_too_large(client, auth, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    big = b"a" * (settings.max_upload_bytes + 1)
    resp = client.post("/api/v1/ingest", headers=auth, files={"file": ("big.txt", big, "text/plain")})
    assert resp.status_code == 413


def test_clean_extracted_text_strips_toc_and_page_numbers():
    raw = "\n".join([
        "Chapter 3 Photosynthesis ........ 45",
        "12",
        "Page 7",
        "3 of 10",
        "Plants convert light energy into chemical energy.",
    ])
    assert _clean_extracted_text(raw) == "Plants convert light energy into chemical energy."
