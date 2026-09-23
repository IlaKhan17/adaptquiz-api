import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, X } from "lucide-react";
import { getSessionQuiz, submitAnswer } from "../lib/api";
import type { AnswerEvalResponse, Question, QuizResponse } from "../types";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { Textarea } from "../components/ui/Input";
import { Mark } from "../components/ui/Mark";
import { cn, errorDetail, QUESTION_TYPE_LABELS } from "../lib/utils";

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
    <div className="space-y-2.5" role="radiogroup" aria-label="Answer options">
      {question.options?.map((opt) => {
        const isSelected = selected === opt.label;
        const isCorrect = !!feedback && opt.label === feedback.correct_option_label;
        const isWrongPick = !!feedback && isSelected && !isCorrect;
        return (
          <button
            key={opt.label}
            role="radio"
            aria-checked={isSelected}
            onClick={() => !disabled && onSelect(opt.label)}
            className={cn(
              "w-full flex items-start gap-3 text-left px-4 py-3 rounded-md border transition-colors",
              !feedback && isSelected && "border-ink bg-pen-wash",
              !feedback && !isSelected && "border-rule bg-paper hover:border-ink-faint",
              isCorrect && "border-right bg-right-wash",
              isWrongPick && "border-marker bg-marker-wash",
              feedback && !isCorrect && !isWrongPick && "border-rule-soft bg-paper text-ink-muted",
              disabled && "cursor-default"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                !feedback && isSelected ? "border-ink bg-ink text-white" : "border-current",
                isCorrect && "border-right bg-right text-white",
                isWrongPick && "border-marker bg-marker text-white"
              )}
            >
              {isCorrect ? <Check className="w-3.5 h-3.5" /> : isWrongPick ? <X className="w-3.5 h-3.5" /> : opt.label}
            </span>
            <span className={cn("leading-7", isWrongPick && "line-through decoration-marker/60")}>{opt.text}</span>
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
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="True or false">
      {["True", "False"].map((v) => {
        const isSelected = selected === v;
        const isCorrect = !!feedback && feedback.correct_answer.toLowerCase() === v.toLowerCase();
        const isWrongPick = !!feedback && isSelected && !isCorrect;
        return (
          <button
            key={v}
            role="radio"
            aria-checked={isSelected}
            onClick={() => !disabled && onSelect(v)}
            className={cn(
              "py-5 rounded-md border text-lg font-bold transition-colors",
              !feedback && isSelected && "border-ink bg-ink text-white",
              !feedback && !isSelected && "border-rule bg-paper hover:border-ink-faint",
              isCorrect && "border-right bg-right-wash text-right",
              isWrongPick && "border-marker bg-marker-wash text-marker line-through",
              feedback && !isCorrect && !isWrongPick && "border-rule-soft text-ink-faint",
              disabled && "cursor-default"
            )}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

/** Marking notes under the answer: per-criterion scores, then what to take away. */
function Marking({ feedback }: { feedback: AnswerEvalResponse }) {
  const rubric = feedback.rubric_feedback.filter((r) => r.comment);
  const showRubric = rubric.length > 1; // single "Accuracy" line for MCQ/TF adds nothing
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.2 }}
      className="mt-6 border-t border-rule-soft pt-5 space-y-4"
      aria-live="polite"
    >
      {showRubric && (
        <dl className="space-y-3">
          {rubric.map((item) => (
            <div key={item.criterion} className="grid grid-cols-[7.5rem_1fr_auto] gap-x-3 gap-y-0.5 items-baseline">
              <dt className="font-bold">{item.criterion}</dt>
              <dd className="text-ink-soft text-[0.95rem] row-start-2 col-span-3 sm:row-start-auto sm:col-span-1">
                {item.comment}
              </dd>
              <dd className="font-bold tabular-nums text-right row-start-1 col-start-3">
                {Math.round(item.score * 100)}%
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!feedback.is_correct && (
        <div>
          <p className="font-bold">Correct answer</p>
          <p className="text-ink-soft">{feedback.correct_answer}</p>
        </div>
      )}
      {feedback.detailed_explanation && (
        <div>
          <p className="font-bold">Why</p>
          <p className="text-ink-soft leading-relaxed">{feedback.detailed_explanation}</p>
        </div>
      )}
      {feedback.improvement_tip && (
        <p className="bg-highlight-soft rounded-md px-4 py-3 leading-relaxed">
          <span className="font-bold">Next time: </span>
          {feedback.improvement_tip}
        </p>
      )}
    </motion.div>
  );
}

export default function Quiz() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const stateQuiz = (location.state as { quiz?: QuizResponse })?.quiz;

  const { data: fetchedQuiz, isLoading: quizLoading, isError } = useQuery({
    queryKey: ["session-quiz", sessionId],
    queryFn: () => getSessionQuiz(sessionId!),
    enabled: !stateQuiz && !!sessionId,
  });

  const quiz = stateQuiz ?? fetchedQuiz;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerEvalResponse | null>(null);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const question = quiz?.questions[currentIdx];
  const isLastQuestion = quiz ? currentIdx === quiz.questions.length - 1 : false;

  useEffect(() => {
    setAnswer("");
    setFeedback(null);
    if (currentIdx > 0) headingRef.current?.focus();
  }, [currentIdx]);

  const submitMutation = useMutation({
    mutationFn: () => submitAnswer(quiz!.session_id, question!.question_id, answer),
    onSuccess: (data) => {
      setFeedback(data);
      setResults((r) => ({ ...r, [data.question_id]: data.is_correct }));
    },
  });

  const handleNext = () => {
    if (isLastQuestion) navigate(`/results/${quiz!.session_id}`);
    else setCurrentIdx((i) => i + 1);
  };

  if (isError) {
    return (
      <div className="max-w-xl sheet p-8">
        <h1 className="text-heading">This quiz couldn’t be opened</h1>
        <p className="mt-2 text-ink-soft">It may have been removed, or the link is wrong.</p>
        <Button className="mt-6" onClick={() => navigate("/dashboard")}>Back to your desk</Button>
      </div>
    );
  }

  if (quizLoading || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Spinner size="lg" />
        <p className="text-ink-muted">Opening the quiz…</p>
      </div>
    );
  }

  if (!question) return null;

  const isWritten = question.question_type === "short_answer" || question.question_type === "fill_blank";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Where you are in the paper */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-1 font-bold text-ink-soft hover:text-ink"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          Leave quiz
        </button>
        <ol className="flex gap-1.5" aria-label={`Question ${currentIdx + 1} of ${quiz.total_questions}`}>
          {quiz.questions.map((q, i) => {
            const r = results[q.question_id];
            return (
              <li
                key={q.question_id}
                className={cn(
                  "h-2 w-5 sm:w-7 rounded-full",
                  r === true && "bg-right",
                  r === false && "bg-marker",
                  r === undefined && (i === currentIdx ? "bg-ink" : "bg-rule")
                )}
              />
            );
          })}
        </ol>
      </div>

      <AnimatePresence mode="wait">
        <motion.article
          key={currentIdx}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="sheet relative"
        >
          <div className="ruled px-5 sm:px-10 pt-7 pb-8">
            <div className="flex items-baseline justify-between gap-4 pr-20 sm:pr-24">
              <p className="text-sm text-ink-muted">
                Question {currentIdx + 1} of {quiz.total_questions}, {QUESTION_TYPE_LABELS[question.question_type].toLowerCase()}
              </p>
              <p className="text-sm text-ink-muted capitalize">{question.difficulty}</p>
            </div>

            {/* The examiner's mark, written in the margin once the answer is graded */}
            {feedback && (
              <div className="absolute right-4 sm:right-8 top-4 text-right" aria-hidden>
                <Mark tone={feedback.is_correct ? "right" : "marker"} className="text-5xl sm:text-6xl">
                  {feedback.is_correct ? "✓" : "✗"}
                </Mark>
                <Mark
                  tone={feedback.is_correct ? "right" : "marker"}
                  className="block text-2xl sm:text-3xl mt-1 [animation-delay:120ms]"
                >
                  {feedback.score_percentage}%
                </Mark>
              </div>
            )}

            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-3 mb-7 text-xl sm:text-2xl font-bold leading-8 sm:leading-9 pr-16 sm:pr-20 focus:outline-none"
            >
              {question.question_text}
            </h1>

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
              <TrueFalseInput selected={answer} onSelect={setAnswer} disabled={!!feedback} feedback={feedback} />
            )}
            {isWritten && (
              <Textarea
                aria-label="Your answer"
                placeholder={
                  question.question_type === "fill_blank" ? "The missing word or phrase" : "Write your answer in a sentence or two"
                }
                rows={question.question_type === "fill_blank" ? 1 : 4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && answer.trim() && !feedback) submitMutation.mutate();
                }}
                disabled={!!feedback}
                className="bg-transparent"
              />
            )}

            {submitMutation.isError && (
              <p role="alert" className="mt-4 text-sm text-marker bg-marker-wash rounded-md p-3">
                {errorDetail(submitMutation.error, "Your answer couldn’t be marked. Try submitting again.")}
              </p>
            )}

            {feedback && <Marking feedback={feedback} />}
          </div>

          <div className="border-t border-rule-soft px-5 sm:px-10 py-5 flex items-center justify-between gap-4">
            <p className="text-sm text-ink-muted hidden sm:block">
              {!feedback && isWritten
                ? "Written answers are marked for accuracy, completeness and terms used."
                : ""}
            </p>
            {!feedback ? (
              <Button
                size="lg"
                className="w-full sm:w-auto"
                loading={submitMutation.isPending}
                disabled={!answer.trim()}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending ? (isWritten ? "Marking…" : "Checking…") : "Submit answer"}
              </Button>
            ) : (
              <Button size="lg" className="w-full sm:w-auto" onClick={handleNext} autoFocus>
                {isLastQuestion ? "See your results" : "Next question"}
              </Button>
            )}
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
  );
}
