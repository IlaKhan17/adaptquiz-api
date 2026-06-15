import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  XCircle,
} from "lucide-react";
import { getSessionQuiz, submitAnswer } from "../lib/api";
import type { AnswerEvalResponse, Question, QuizResponse } from "../types";
import Button from "../components/ui/Button";
import Progress from "../components/ui/Progress";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import { Textarea } from "../components/ui/Input";

function MCQInput({
  question,
  selected,
  onSelect,
  disabled,
  feedback,
}: {
  question: Question;
  selected: string;
  onSelect: (v: string) => void;
  disabled: boolean;
  feedback: AnswerEvalResponse | null;
}) {
  return (
    <div className="space-y-3">
      {question.options?.map((opt) => {
        let cls =
          "w-full text-left p-4 rounded-xl border-2 transition-all font-normal text-sm";
        if (feedback) {
          if (opt.is_correct) cls += " border-emerald-500 bg-emerald-50 text-emerald-800";
          else if (selected === opt.label && !opt.is_correct)
            cls += " border-red-400 bg-red-50 text-red-800";
          else cls += " border-gray-100 bg-gray-50 text-gray-500";
        } else if (selected === opt.label) {
          cls += " border-indigo-600 bg-indigo-50 text-indigo-900";
        } else {
          cls += " border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 text-gray-800";
        }
        return (
          <button
            key={opt.label}
            onClick={() => !disabled && onSelect(opt.label)}
            className={cls}
          >
            <span className="font-semibold mr-2 text-current">{opt.label}.</span>
            {opt.text}
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseInput({
  selected,
  onSelect,
  disabled,
  feedback,
}: {
  selected: string;
  onSelect: (v: string) => void;
  disabled: boolean;
  feedback: AnswerEvalResponse | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {["True", "False"].map((v) => {
        let cls =
          "py-8 rounded-2xl border-2 text-lg font-semibold transition-all";
        if (feedback) {
          const isCorrect =
            feedback.correct_answer.toLowerCase() === v.toLowerCase();
          if (isCorrect) cls += " border-emerald-500 bg-emerald-50 text-emerald-700";
          else if (selected === v && !isCorrect)
            cls += " border-red-400 bg-red-50 text-red-600";
          else cls += " border-gray-100 bg-gray-50 text-gray-400";
        } else if (selected === v) {
          cls += " border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm";
        } else {
          cls += " border-gray-200 bg-white hover:border-indigo-300 text-gray-700";
        }
        return (
          <button key={v} onClick={() => !disabled && onSelect(v)} className={cls}>
            {v}
          </button>
        );
      })}
    </div>
  );
}

export default function Quiz() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const stateQuiz = (location.state as { quiz?: QuizResponse })?.quiz;

  const { data: fetchedQuiz, isLoading: quizLoading } = useQuery({
    queryKey: ["session-quiz", sessionId],
    queryFn: () => getSessionQuiz(sessionId!),
    enabled: !stateQuiz && !!sessionId,
  });

  const quiz = stateQuiz ?? fetchedQuiz;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerEvalResponse | null>(null);

  const question = quiz?.questions[currentIdx];
  const isLastQuestion = quiz ? currentIdx === quiz.questions.length - 1 : false;

  useEffect(() => {
    setAnswer("");
    setFeedback(null);
  }, [currentIdx]);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitAnswer(quiz!.session_id, question!.question_id, answer),
    onSuccess: (data) => setFeedback(data),
  });

  const handleNext = () => {
    if (isLastQuestion) {
      navigate(`/results/${quiz!.session_id}`);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  };

  if (quizLoading || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-gray-500">Loading quiz…</p>
      </div>
    );
  }

  if (!question) return null;

  const progress = ((currentIdx + 1) / quiz.total_questions) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
            Exit
          </button>
          <span className="text-sm font-medium text-gray-600">
            {currentIdx + 1} / {quiz.total_questions}
          </span>
          <Badge
            variant={
              question.difficulty === "easy"
                ? "success"
                : question.difficulty === "hard"
                ? "error"
                : "warning"
            }
          >
            {question.difficulty}
          </Badge>
        </div>
        <Progress value={progress} color="indigo" size="sm" />
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="flex items-start gap-3 mb-6">
              <span className="mt-0.5 shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold flex items-center justify-center">
                {currentIdx + 1}
              </span>
              <p className="text-base font-medium text-gray-900 leading-relaxed">
                {question.question_text}
              </p>
            </div>

            {/* Answer input by type */}
            {question.question_type === "mcq" && (
              <MCQInput
                question={question}
                selected={answer}
                onSelect={setAnswer}
                disabled={!!feedback}
                feedback={feedback}
              />
            )}
            {question.question_type === "true_false" && (
              <TrueFalseInput
                selected={answer}
                onSelect={setAnswer}
                disabled={!!feedback}
                feedback={feedback}
              />
            )}
            {(question.question_type === "short_answer" ||
              question.question_type === "fill_blank") && (
              <Textarea
                placeholder={
                  question.question_type === "fill_blank"
                    ? "Fill in the blank..."
                    : "Write your answer here..."
                }
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={!!feedback}
              />
            )}
          </div>

          {/* Feedback card */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-5 mb-4 ${
                feedback.is_correct
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {feedback.is_correct ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                )}
                <span className="font-semibold text-gray-900">
                  {feedback.is_correct ? "Correct!" : "Incorrect"}
                </span>
                <span
                  className={`ml-auto text-lg font-bold ${
                    feedback.is_correct ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {feedback.score_percentage}%
                </span>
              </div>

              <div className="space-y-1.5 mb-3">
                {feedback.rubric_feedback.map((item) => (
                  <div key={item.criterion} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.criterion}</span>
                    <span className="font-medium text-gray-800">
                      {Math.round(item.score * 100)}%
                    </span>
                  </div>
                ))}
              </div>

              {!feedback.is_correct && (
                <div className="border-t border-current/10 pt-3 mt-3 space-y-2">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Correct answer
                    </span>
                    <p className="text-sm text-gray-800 mt-0.5">{feedback.correct_answer}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Explanation
                    </span>
                    <p className="text-sm text-gray-700 mt-0.5">{feedback.detailed_explanation}</p>
                  </div>
                  {feedback.improvement_tip && (
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Tip
                      </span>
                      <p className="text-sm text-gray-700 mt-0.5">{feedback.improvement_tip}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Action buttons */}
          {!feedback ? (
            <Button
              fullWidth
              size="lg"
              loading={submitMutation.isPending}
              disabled={!answer.trim()}
              onClick={() => submitMutation.mutate()}
            >
              Submit Answer
            </Button>
          ) : (
            <Button fullWidth size="lg" onClick={handleNext}>
              {isLastQuestion ? "View Results" : "Next Question"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
