import json


_RUBRIC_CRITERIA = [
    {
        "criterion": "Accuracy",
        "description": (
            "Is the core claim or answer factually correct? "
            "Full credit if fully correct; partial credit if partially correct; "
            "zero if the central claim is wrong."
        ),
    },
    {
        "criterion": "Completeness",
        "description": (
            "Does the answer address all parts of the question? "
            "Deduct proportionally for missing key components."
        ),
    },
    {
        "criterion": "Terminology",
        "description": (
            "Does the answer use domain-appropriate terms correctly? "
            "Reward precise vocabulary; penalise misused or missing key terms."
        ),
    },
]


def build_eval_prompt(
    question: str,
    correct_answer: str,
    explanation: str,
    student_answer: str,
) -> str:
    rubric_block = "\n".join(
        f"  {i + 1}. {c['criterion']}: {c['description']}"
        for i, c in enumerate(_RUBRIC_CRITERIA)
    )

    criteria_names = [c["criterion"] for c in _RUBRIC_CRITERIA]

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

    return f"""You are a strict but fair educational evaluator. Your role is to assess a student's \
answer objectively, award partial credit where appropriate, and provide constructive feedback \
that helps the student improve.

---
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
Score the student's answer against each of the three rubric criteria below. \
Each criterion is scored independently on a 0.0–1.0 scale. \
Partial credit is allowed and encouraged where the student demonstrates partial understanding.

RUBRIC CRITERIA
{rubric_block}

SCORING RULES
- overall score = mean of the three criterion scores (round to 2 decimal places)
- score_percentage = round(score × 100) as an integer
- is_correct = true if score >= 0.7, otherwise false
- Be strict on factual accuracy but generous on wording unless terminology is being tested

OUTPUT FIELD DEFINITIONS
- is_correct (bool): overall pass/fail at the 0.7 threshold
- score (float 0.0–1.0): mean criterion score
- score_percentage (int 0–100): score × 100 rounded
- rubric_feedback (list): one object per criterion in this order: {criteria_names}
    each object has: criterion (str), score (float 0.0–1.0), comment (str)
- detailed_explanation (str): plain English explanation of what the correct answer is and why, \
regardless of what the student wrote
- improvement_tip (str): one specific, actionable thing the student should do to strengthen \
their understanding (e.g. "Re-read section X", "Practice distinguishing Y from Z")
- knowledge_gap_tags (list[str]): short topic labels for concepts the student should revisit, \
inferred from where they lost marks; empty list if the answer was fully correct

EXAMPLE OUTPUT SHAPE
{schema_example}

STRICT RULES
1. Respond with ONLY a valid JSON object — no markdown fences, no prose, no extra keys.
2. Do not add keys not listed above.
3. rubric_feedback must contain exactly 3 items in the order: {criteria_names}.
4. Base the evaluation solely on the question, correct answer, and explanation provided above.

Output the JSON object now."""
