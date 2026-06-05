from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class QuizType(str, Enum):
    mcq = "mcq"
    short_answer = "short_answer"
    true_false = "true_false"
    fill_blank = "fill_blank"


class MCQOption(BaseModel):
    label: str = Field(description="Single-letter label for the option, e.g. 'A', 'B', 'C', 'D'")
    text: str = Field(description="Display text for this answer choice")
    is_correct: bool = Field(description="Whether this option is the correct answer")


class Question(BaseModel):
    question_id: str = Field(description="Unique identifier for the question")
    question_text: str = Field(description="The full text of the question presented to the student")
    question_type: QuizType = Field(description="Format of the question (mcq, short_answer, true_false, fill_blank)")
    difficulty: Difficulty = Field(description="Difficulty level of the question")
    options: Optional[list[MCQOption]] = Field(
        default=None,
        description="Answer choices for MCQ questions; null for other question types",
    )
    correct_answer: str = Field(description="The correct answer or expected response for this question")
    explanation: str = Field(description="Explanation of why the correct answer is correct")
    source_chunk: str = Field(description="The source text chunk from the document that this question is based on")
    topic_tag: str = Field(description="Short topic or concept tag that categorises this question")


class QuizGenerateRequest(BaseModel):
    doc_id: str = Field(description="Identifier of the ingested document to generate the quiz from")
    topic: Optional[str] = Field(default=None, description="Optional specific topic or section to focus questions on")
    difficulty: Difficulty = Field(default=Difficulty.medium, description="Target difficulty level for all questions")
    question_types: list[QuizType] = Field(
        default=[QuizType.mcq, QuizType.short_answer],
        description="List of question formats to include in the quiz",
    )
    num_questions: int = Field(
        default=5,
        ge=1,
        le=15,
        description="Number of questions to generate (1–15)",
    )


class QuizResponse(BaseModel):
    quiz_id: str = Field(description="Unique identifier for this generated quiz")
    doc_id: str = Field(description="Identifier of the source document")
    topic: Optional[str] = Field(default=None, description="Topic filter used when generating the quiz, if any")
    difficulty: Difficulty = Field(description="Difficulty level applied to the quiz")
    questions: list[Question] = Field(description="Ordered list of questions in the quiz")
    total_questions: int = Field(description="Total number of questions in the quiz")
    session_id: str = Field(description="Session identifier to use when submitting answers for this quiz")
