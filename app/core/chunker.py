import re


def chunk_text(
    text: str,
    doc_id: str,
    chunk_size: int = 800,
    overlap: int = 100,
) -> list[dict]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())

    chunks = []
    current = []
    current_len = 0

    for sentence in sentences:
        sentence_len = len(sentence)
        if current_len + sentence_len > chunk_size and current:
            chunk_text_str = " ".join(current)
            chunks.append(chunk_text_str)
            # roll back by overlap characters worth of sentences
            overlap_text = ""
            for s in reversed(current):
                if len(overlap_text) + len(s) + 1 <= overlap:
                    overlap_text = s + (" " + overlap_text if overlap_text else "")
                else:
                    break
            current = overlap_text.split() and [overlap_text] if overlap_text else []
            current_len = len(overlap_text)
        current.append(sentence)
        current_len += sentence_len + 1

    if current:
        chunks.append(" ".join(current))

    return [
        {
            "text": chunk,
            "index": i,
            "doc_id": doc_id,
            "metadata": {"doc_id": doc_id, "chunk_index": i},
        }
        for i, chunk in enumerate(chunks)
    ]
