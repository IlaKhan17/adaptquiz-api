import json


_DIFFICULTY_GUIDANCE = {
    "easy": (
        "Test direct recall of key definitions, named concepts, and stated facts. "
        "A student who has read the material once should be able to answer."
    ),
    "medium": (
        "Test understanding and application. The student must explain WHY or HOW, "
        "apply a concept to a scenario, or distinguish between two related ideas."
    ),
    "hard": (
        "Test analysis and critical thinking. The student must compare/contrast, "
        "evaluate trade-offs, identify limitations, or synthesise multiple concepts."
    ),
}

_QUESTION_TYPE_RULES = {
    "mcq": (
        "Multiple-choice: provide exactly 4 options labelled A, B, C, D. "
        "Exactly one option must be correct. "
        "Distractors must be plausible misconceptions or common errors, NOT obviously wrong. "
        "The correct_answer field must be just the label letter, e.g. 'B'."
    ),
    "short_answer": (
        "Short answer: the student writes a 1–3 sentence explanation. "
        "The correct_answer field must be a model answer of 1–3 sentences. "
        "Do NOT ask for a one-word answer — require a brief explanation."
    ),
    "true_false": (
        "True/False: make a clear declarative statement. "
        "The correct_answer field must be exactly 'True' or 'False' (capitalised). "
        "The explanation must justify why the statement is true or false."
    ),
    "fill_blank": (
        "Fill-in-the-blank: write the question with exactly one blank represented as '___'. "
        "The blank must replace a key term or concept. "
        "The correct_answer field must be the exact term from the material."
    ),
}

_STUDY_QUALITY_RULES = """\
STUDY-QUALITY RULES (strictly enforced)
1. Every question must test a KEY concept, definition, principle, or mechanism — \
not a trivial detail, proper noun, or date.
2. Questions must reflect what would appear on a course exam or practice test.
3. Prefer questions that test understanding over questions that test memorisation, \
unless the difficulty is 'easy'.
4. NEVER ask about: page numbers, chapter numbers, author names, section headings, \
glossary entries, figure captions, table-of-contents items, or index references.
5. Each question must be independent — assume no knowledge from other questions in this set.
6. The explanation (2–4 sentences) must teach the student why the correct answer is right.
7. If a curriculum was provided, ensure question depth and vocabulary match that level."""


def build_question_gen_prompt(
    context: str,
    difficulty: str,
    q_types: list[str],
    num_questions: int,
    topic: str | None = None,
    curriculum: str | None = None,
    web_context: str | None = None,
) -> str:
    difficulty_line = _DIFFICULTY_GUIDANCE.get(difficulty, difficulty)

    type_rules_block = "\n".join(
        f"  - {qt}: {_QUESTION_TYPE_RULES[qt]}"
        for qt in q_types
        if qt in _QUESTION_TYPE_RULES
    )

    topic_instruction = (
        f"Focus exclusively on the following topic within the material: **{topic}**\n"
        if topic
        else "Cover the most important and broadly applicable concepts from across the material.\n"
    )

    schema_example = json.dumps(
        {
            "questions": [
                {
                    "question_text": "string",
                    "question_type": " | ".join(q_types),
                    "difficulty": difficulty,
                    "options": [
                        {"label": "A", "text": "string", "is_correct": False},
                        {"label": "B", "text": "string", "is_correct": True},
                        {"label": "C", "text": "string", "is_correct": False},
                        {"label": "D", "text": "string", "is_correct": False},
                    ],
                    "correct_answer": "string",
                    "explanation": "string — 2-4 sentences explaining why the answer is correct",
                    "source_chunk": "exact verbatim quote from material (max 40 words)",
                    "topic_tag": "string — 1-4 word concept label",
                }
            ]
        },
        indent=2,
    )

    curriculum_block = ""
    if curriculum:
        curriculum_block = f"CURRICULUM: {curriculum}\n"
        if web_context:
            curriculum_block += (
                f"The following content was retrieved from the web about this curriculum "
                f"and subject. Use it ONLY to understand what concepts matter for this curriculum "
                f"and to calibrate question depth — do NOT invent facts from it.\n"
                f"---\nCURRICULUM CONTEXT (web):\n{web_context}\n---\n"
            )
        else:
            curriculum_block += (
                "Align questions to the scope and depth expected at this curriculum level.\n"
            )

    return f"""You are an expert educational assessment designer. \
Your job is to create high-quality quiz questions that genuinely test a student's \
understanding of the study material — not trivial recall of incidental details.

The study material below contains ONLY substantive academic content. \
Do NOT ask questions about page numbers, chapter headings, author names, \
glossary entries, or table-of-contents items — these have already been removed.

---
STUDY MATERIAL:
{context}
---
{curriculum_block}
TASK
Generate exactly {num_questions} quiz question(s) from the study material above.

DIFFICULTY: {difficulty}
Guidance: {difficulty_line}

{topic_instruction}
QUESTION TYPES REQUESTED
Only use the following question type(s). Follow the format rules for each type exactly.
{type_rules_block}

{_STUDY_QUALITY_RULES}

FIELD DEFINITIONS
- question_text: the full question string shown to the student
- question_type: one of {q_types}
- difficulty: "{difficulty}"
- options: required for mcq only; null for all other types
- correct_answer: for mcq → the label letter only (e.g. "B"); \
for true_false → "True" or "False"; for others → the model answer string
- explanation: 2–4 sentences explaining why the correct answer is right and what the concept means
- source_chunk: a verbatim quote of at most 40 words from the study material \
that directly supports this question (must be real text from the material)
- topic_tag: a short label (1–4 words) naming the concept being tested

OUTPUT FORMAT
Return a JSON object with a single key "questions" whose value is an array of \
exactly {num_questions} question object(s).
{schema_example}

STRICT OUTPUT RULES
1. Respond with ONLY a valid JSON object — no markdown fences, no prose.
2. Do NOT invent facts not present in the study material.
3. Every question must be fully answerable from the provided context.
4. Distribute question types evenly across the {num_questions} question(s).
5. source_chunk must be a real verbatim excerpt, not paraphrased.

Output the JSON object now."""
