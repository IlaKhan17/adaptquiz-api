import re

_SHORT_LINE_MAX = 40   # chars — lines shorter than this are likely TOC/index noise
_NOISE_RATIO_THRESHOLD = 0.65  # if this fraction of lines are short, reject the chunk
_MIN_WORD_COUNT = 15   # chunks with fewer words are almost always headers or stubs


def _is_academic_chunk(text: str) -> bool:
    """Return False for chunks that look like TOC, index, glossary stubs, or page-number pages."""
    words = text.split()
    if len(words) < _MIN_WORD_COUNT:
        return False

    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return False

    short_lines = sum(1 for l in lines if len(l) < _SHORT_LINE_MAX)
    if len(lines) >= 4 and short_lines / len(lines) >= _NOISE_RATIO_THRESHOLD:
        return False

    return True


def chunk_text(
    text: str,
    doc_id: str,
    chunk_size: int = 800,
    overlap: int = 100,
) -> list[dict]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())

    raw_chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for sentence in sentences:
        sentence_len = len(sentence)
        if current_len + sentence_len > chunk_size and current:
            chunk_text_str = " ".join(current)
            raw_chunks.append(chunk_text_str)
            overlap_text = ""
            for s in reversed(current):
                if len(overlap_text) + len(s) + 1 <= overlap:
                    overlap_text = s + (" " + overlap_text if overlap_text else "")
                else:
                    break
            current = [overlap_text] if overlap_text else []
            current_len = len(overlap_text)
        current.append(sentence)
        current_len += sentence_len + 1

    if current:
        raw_chunks.append(" ".join(current))

    academic_chunks = [c for c in raw_chunks if _is_academic_chunk(c)]

    return [
        {
            "text": chunk,
            "index": i,
            "doc_id": doc_id,
            "metadata": {"doc_id": doc_id, "chunk_index": i},
        }
        for i, chunk in enumerate(academic_chunks)
    ]
