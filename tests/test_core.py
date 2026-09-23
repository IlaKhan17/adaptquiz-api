import pytest

from app.core.chunker import chunk_text
from app.core.vector_store import add_texts_and_save, get_or_create_store, search_by_doc
from app.services.quiz_service import _parse_question_list, _sample_chunks
from app.services.session_service import _score_to_grade


def test_chunker_respects_size_and_drops_noise():
    text = ("Mitochondria generate ATP through cellular respiration in eukaryotic cells. " * 40)
    chunks = chunk_text(text, "doc-1", chunk_size=300, overlap=50)
    assert len(chunks) > 1
    assert all(len(c["text"]) <= 400 for c in chunks)
    assert [c["index"] for c in chunks] == list(range(len(chunks)))

    toc = "\n".join(f"Chapter {i}" for i in range(30))
    assert chunk_text(toc, "doc-2") == []


def test_search_by_doc_is_not_crowded_out_by_other_documents(client):
    """A document's chunks must be found even when many closer matches belong to other docs."""
    get_or_create_store()
    noise = [f"Photosynthesis in chloroplasts, variant {i}." for i in range(300)]
    add_texts_and_save(noise, [{"doc_id": "noise-doc", "chunk_index": i} for i in range(300)])
    add_texts_and_save(
        ["Medieval castles were built with thick stone walls and moats."],
        [{"doc_id": "target-doc", "chunk_index": 0}],
    )

    results = search_by_doc(get_or_create_store(), "photosynthesis chloroplasts", "target-doc", k=5)
    assert len(results) == 1
    assert results[0]["metadata"]["doc_id"] == "target-doc"


def test_parse_question_list_shapes():
    q = {"question_text": "Q?"}
    assert _parse_question_list('{"questions": [{"question_text": "Q?"}]}') == [q]
    assert _parse_question_list('[{"question_text": "Q?"}]') == [q]
    assert _parse_question_list('{"quiz": [{"question_text": "Q?"}]}') == [q]
    with pytest.raises(ValueError):
        _parse_question_list('{"foo": 1}')


def test_sample_chunks_spreads_across_document():
    chunks = [{"i": i} for i in range(100)]
    sampled = _sample_chunks(chunks, 10)
    assert [c["i"] for c in sampled] == list(range(0, 100, 10))
    assert _sample_chunks(chunks[:3], 10) == chunks[:3]


@pytest.mark.parametrize(
    "score,grade",
    [(0.95, "A+"), (0.9, "A+"), (0.85, "A"), (0.7, "B"), (0.6, "C"), (0.2, "Needs Improvement")],
)
def test_score_to_grade(score, grade):
    assert _score_to_grade(score) == grade
