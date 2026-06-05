from pydantic import BaseModel, Field


class AnswerSubmitRequest(BaseModel):
    session_id: str = Field(description="Session identifier returned when the quiz was generated")
    question_id: str = Field(description="Identifier of the question being answered")
    student_answer: str = Field(description="The student's answer text to be evaluated")


class FeedbackItem(BaseModel):
    criterion: str = Field(description="The grading criterion being assessed, e.g. 'accuracy', 'completeness'")
    score: float = Field(description="Score awarded for this criterion, typically 0.0–1.0")
    comment: str = Field(description="Specific feedback comment explaining the score for this criterion")


class AnswerEvalResponse(BaseModel):
    question_id: str = Field(description="Identifier of the evaluated question")
    student_answer: str = Field(description="The student's original answer as submitted")
    is_correct: bool = Field(description="Whether the answer is considered correct overall")
    score: float = Field(description="Raw score awarded for the answer, typically 0.0–1.0")
    score_percentage: int = Field(description="Score expressed as a percentage (0–100)")
    rubric_feedback: list[FeedbackItem] = Field(
        description="Detailed per-criterion feedback from the AI grader"
    )
    correct_answer: str = Field(description="The expected correct answer for reference")
    detailed_explanation: str = Field(
        description="Full explanation of the correct answer and why the student's response was graded as it was"
    )
    improvement_tip: str = Field(
        description="Actionable tip the student can use to improve their understanding of this topic"
    )
    knowledge_gap_tags: list[str] = Field(
        description="Short concept tags identifying knowledge gaps revealed by this answer"
    )
