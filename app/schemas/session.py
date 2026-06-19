from pydantic import BaseModel, Field


class SessionReport(BaseModel):
    session_id: str = Field(description="Unique identifier of the quiz session")
    total_questions: int = Field(description="Total number of questions in the session")
    answered: int = Field(description="Number of questions the student has answered so far")
    correct_count: int = Field(description="Number of questions answered correctly")
    overall_score: float = Field(description="Aggregate score across all answered questions, typically 0.0–1.0")
    grade: str = Field(description="Letter grade or label derived from the overall score, e.g. 'A', 'B+', 'Pass'")
    knowledge_gaps: list[dict] = Field(
        description="List of identified knowledge gap objects, each containing a topic tag and frequency count"
    )
    recommendation: str = Field(
        description="Personalised study recommendation based on the student's performance and knowledge gaps"
    )
    question_breakdown: list[dict] = Field(
        description="Per-question summary objects containing question_id, is_correct, score, score_percentage, and topic_tag"
    )
