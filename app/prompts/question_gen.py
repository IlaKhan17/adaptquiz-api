import json


_DIFFICULTY_GUIDANCE = {
    "easy": "basic recall — students should be able to answer from memory after a single read",
    "medium": "understanding and application — students must explain concepts or apply them to a scenario",
    "hard": "analysis and critical thinking — students must compare, evaluate, or synthesise ideas",
}

_QUESTION_TYPE_RULES = {
    "mcq": (
        "Multiple-choice: provide exactly 4 options labelled A, B, C, D. "
        "Exactly one option must be correct. Distractors must be plausible but clearly wrong."
    ),
    "short_answer": (
        "Short answer: the student must write a 1–3 sentence explanation. "
        "The correct_answer field should be a model answer of that length."
    ),
    "true_false": (
        "True/False: the answer must be exactly 'True' or 'False'. "
        "The explanation must justify why the statement is true or false."
    ),
    "fill_blank": (
        "Fill-in-the-blank: the answer must be an exact term or short phrase taken directly from the material. "
        "Phrase the question with a blank represented by '___'."
    ),
}


def build_question_gen_prompt(
    context: str,
    difficulty: str,
    q_types: list[str],
    num_questions: int,
    topic: str | None = None,
) -> str:
    difficulty_line = _DIFFICULTY_GUIDANCE.get(difficulty, difficulty)

    type_rules_block = "\n".join(
        f"  - {qt}: {_QUESTION_TYPE_RULES[qt]}"
        for qt in q_types
        if qt in _QUESTION_TYPE_RULES
    )

    topic_instruction = (
        f"Focus exclusively on the following topic: {topic}\n"
        if topic
        else "Cover a range of topics from the material.\n"
    )

    schema_example = json.dumps(
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
            "explanation": "string",
            "source_chunk": "exact quote from material (max 40 words)",
            "topic_tag": "string",
        },
        indent=2,
    )

    return f"""You are an expert educational assessment designer with deep experience creating \
high-quality quiz questions for academic study materials.

---
STUDY MATERIAL:
{context}
---

TASK
Generate exactly {num_questions} quiz question(s) from the study material above.

DIFFICULTY: {difficulty}
Guidance: {difficulty_line}

{topic_instruction}
QUESTION TYPES REQUESTED
Only use the following question type(s). Follow the format rules exactly.
{type_rules_block}

FIELD DEFINITIONS
- question_text: the full question string shown to the student
- question_type: one of {q_types}
- difficulty: "{difficulty}"
- options: required for mcq only; omit (or set to null) for all other types
- correct_answer: the definitive correct answer string
- explanation: why the correct answer is correct (2–4 sentences)
- source_chunk: a verbatim quote of at most 40 words from the study material \
that directly supports this question
- topic_tag: a short label (1–4 words) naming the concept being tested

EXAMPLE ELEMENT SHAPE
{schema_example}

STRICT RULES
1. Respond with ONLY a valid JSON array — no markdown fences, no prose, no keys outside the array.
2. Do NOT invent facts, figures, or claims that are not present in the study material.
3. Every question must be answerable solely from the provided context.
4. Distribute question types as evenly as possible across the {num_questions} question(s).
5. The source_chunk must be a real excerpt from the material, not paraphrased.

Output the JSON array now."""
