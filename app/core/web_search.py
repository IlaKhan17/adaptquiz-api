import asyncio
import logging

logger = logging.getLogger(__name__)

_MAX_RESULTS = 5
_MAX_SNIPPETS = 4


async def fetch_curriculum_context(
    curriculum: str,
    subject: str,
    topic: str | None = None,
) -> str:
    """
    Search the web for content relevant to the student's curriculum and subject.
    Returns plain-text snippets to supplement the study material, or "" on failure.
    """
    query_parts = [curriculum, subject]
    if topic:
        query_parts.append(topic)
    query_parts.append("key concepts syllabus learning objectives")
    query = " ".join(query_parts)

    try:
        snippets = await asyncio.to_thread(_ddg_search, query)
        return "\n\n".join(snippets[:_MAX_SNIPPETS])
    except Exception as exc:
        logger.warning("Web search failed (curriculum='%s'): %s", curriculum, exc)
        return ""


def _ddg_search(query: str) -> list[str]:
    from duckduckgo_search import DDGS  # imported lazily so missing package is a soft failure

    with DDGS() as ddgs:
        results = list(ddgs.text(query, max_results=_MAX_RESULTS))

    return [r["body"] for r in results if r.get("body")]
