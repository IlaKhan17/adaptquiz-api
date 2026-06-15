export interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface IngestResponse {
  doc_id: string;
  filename: string;
  subject: string;
  chunks_created: number;
  total_chars: number;
}

export interface DocumentItem {
  doc_id: string;
  filename: string;
  subject: string;
  chunks_created: number;
  total_chars: number;
  created_at: string;
}

export type Difficulty = "easy" | "medium" | "hard";
export type QuizType = "mcq" | "short_answer" | "true_false" | "fill_blank";

export interface MCQOption {
  label: string;
  text: string;
  is_correct: boolean;
}

export interface Question {
  question_id: string;
  question_text: string;
  question_type: QuizType;
  difficulty: Difficulty;
  options: MCQOption[] | null;
  correct_answer: string;
  explanation: string;
  source_chunk: string;
  topic_tag: string;
}

export interface QuizGenerateRequest {
  doc_id: string;
  topic?: string;
  curriculum?: string;
  difficulty: Difficulty;
  question_types: QuizType[];
  num_questions: number;
}

export interface QuizResponse {
  quiz_id: string;
  doc_id: string;
  topic: string | null;
  difficulty: Difficulty;
  questions: Question[];
  total_questions: number;
  session_id: string;
}

export interface QuizListItem {
  quiz_id: string;
  session_id: string;
  doc_filename: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  total_questions: number;
  created_at: string;
}

export interface FeedbackItem {
  criterion: string;
  score: number;
  comment: string;
}

export interface AnswerEvalResponse {
  question_id: string;
  student_answer: string;
  is_correct: boolean;
  score: number;
  score_percentage: number;
  rubric_feedback: FeedbackItem[];
  correct_answer: string;
  detailed_explanation: string;
  improvement_tip: string;
  knowledge_gap_tags: string[];
}

export interface SessionReport {
  session_id: string;
  total_questions: number;
  answered: number;
  overall_score: number;
  grade: string;
  knowledge_gaps: { topic: string; frequency: number }[];
  recommendation: string;
  question_breakdown: {
    question_id: string;
    question_text: string;
    topic_tag: string;
    is_correct: boolean | null;
    score: number | null;
    student_answer: string | null;
    correct_answer: string | null;
    detailed_explanation: string | null;
    improvement_tip: string | null;
    rubric_feedback: { criterion: string; score: number; comment: string }[] | null;
  }[];
}

export interface SessionListItem {
  session_id: string;
  quiz_id: string;
  topic: string | null;
  difficulty: string;
  total_questions: number;
  answered: number;
  overall_score: number | null;
  grade: string | null;
  created_at: string;
}
