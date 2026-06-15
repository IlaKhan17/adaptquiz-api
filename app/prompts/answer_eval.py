import json


_RUBRIC_CRITERIA = [
    {
        "criterion": "Accuracy",
        "description": (
            "Is the core claim factually correct? "
            "Full credit if fully correct; partial credit if partially correct; "
            "zero only if the central claim is wrong."
        ),
    },
    {
        "criterion": "Completeness",
        "description": (
            "Does the answer address all parts of the question? "
            "Deduct proportionally for missing key components. "
            "For short answers (1–3 sentences), a concise but complete answer earns full credit."
        ),
    },
    {
        "criterion": "Terminology",
        "description": (
            "Does the answer use domain-appropriate terms correctly? "
            "Reward precise vocabulary; penalise misused key terms. "
            "Synonyms and paraphrases that convey the same meaning are acceptable."
        ),
    },
]

_FILL_BLANK_EXTRA = (
    "\nSPECIAL RULE FOR FILL-IN-THE-BLANK: "
    "Accept the answer as fully correct if it matches the key term(s) exactly OR "
    "is a reasonable synonym/abbreviation (e.g. 'ML' for 'Machine Learning'). "
    "Minor spelling errors should not cause failure unless they change the meaning."
)


def build_eval_prompt(
    question: str,
    question_type: str,
    correct_answer: str,
    explanation: str,
    student_answer: str,
) -> str:
    rubric_block = "\n".join(
        f"  {i + 1}. {c['criterion']}: {c['description']}"
        for i, c in enumerate(_RUBRIC_CRITERIA)
    )

    criteria_names = [c["criterion"] for c in _RUBRIC_CRITERIA]

    extra_rules = _FILL_BLANK_EXTRA if question_type == "fill_blank" else ""

    schema_example = json.dumps(
        {
            "is_correct": True,
            "score": 0.85,
            "score_percentage": 85,
            "rubric_feedback": [
                {"criterion": "Accuracy", "score": 1.0, "comment": "string"},
                {"criterion": "Completeness", "score": 0.75, "comment": "string"},
                {"criterion": "Terminology", "score": 0.8, "comment": "string"},
            ],
            "detailed_explanation": "string — plain English explanation of the correct answer",
            "improvement_tip": "string — one specific, actionable suggestion",
            "knowledge_gap_tags": ["topic-a", "topic-b"],
        },
        indent=2,
    )

    return f"""You are a fair and constructive educational evaluator. \
Award full credit whenever the student's answer is semantically equivalent to the correct answer, \
even if the wording differs. Only deduct marks when the student is factually wrong or clearly \
misses a required concept.

---
QUESTION TYPE: {question_type}
QUESTION:
{question}

CORRECT ANSWER:
{correct_answer}

ANSWER EXPLANATION:
{explanation}

STUDENT ANSWER:
{student_answer}
---

EVALUATION TASK
Score the student's answer against each rubric criterion (0.0–1.0 per criterion). \
Partial credit is allowed and encouraged for partial understanding.{extra_rules}

RUBRIC CRITERIA
{rubric_block}

SCORING RULES
- overall score = mean of the three criterion scores (round to 2 decimal places)
- score_percentage = round(score × 100) as an integer
- is_correct = true if score >= 0.7, otherwise false
- A semantically correct answer in different words should receive full or near-full credit
- Only mark is_correct = false if the student clearly got the core concept wrong

OUTPUT FIELD DEFINITIONS
- is_correct (bool): overall pass/fail at the 0.7 threshold
- score (float 0.0–1.0): mean criterion score
- score_percentage (int 0–100): score × 100 rounded
- rubric_feedback (list): one object per criterion in this order: {criteria_names}
    each object has: criterion (str), score (float 0.0–1.0), comment (str)
- detailed_explanation (str): plain English explanation of the correct answer
- improvement_tip (str): one specific, actionable suggestion (empty string if fully correct)
- knowledge_gap_tags (list[str]): topic labels for concepts the student should revisit; \
empty list if the answer was fully correct

EXAMPLE OUTPUT SHAPE
{schema_example}

STRICT RULES
1. Respond with ONLY a valid JSON object — no markdown fences, no prose, no extra keys.
2. rubric_feedback must contain exactly 3 items in the order: {criteria_names}.
3. Base the evaluation solely on the question, correct answer, and explanation provided above.

Output the JSON object now."""
